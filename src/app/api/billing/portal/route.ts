import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getActiveTenant } from "@/lib/tenant";
import { getStripe } from "@/lib/stripe";

// Abre o Portal de Cobrança do Stripe para o admin gerenciar a própria
// assinatura (trocar cartão, ver faturas, cancelar).
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const activeTenant = await getActiveTenant();
  const { data: isAdmin } = activeTenant
    ? await supabase.rpc("is_admin_of", { p_tenant: activeTenant.id })
    : { data: false };

  if (!activeTenant || !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // stripe_customer_id fica oculto da API pública (RLS de coluna) — lemos
  // com o client de service_role.
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("stripe_customer_id")
    .eq("id", activeTenant.id)
    .maybeSingle();

  if (!tenant?.stripe_customer_id) {
    return NextResponse.json({ error: "sem_assinatura" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${origin}/admin/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
