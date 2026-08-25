import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

// Webhook do Stripe. Eventos a configurar no dashboard:
//   checkout.session.completed, customer.subscription.updated,
//   customer.subscription.deleted
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `assinatura inválida: ${err.message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription") {
        await provisionTenant(admin, session);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await admin
        .from("tenants")
        .update({
          subscription_status: subscription.status,
          trial_ends_at: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
        })
        .eq("stripe_subscription_id", subscription.id);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

// Cria o estabelecimento (+ programa padrão) e convida o dono como admin,
// assim que o primeiro pagamento é confirmado. Fecha o loop self-service:
// quem assina na landing page já recebe o convite por e-mail para acessar.
async function provisionTenant(
  admin: ReturnType<typeof createAdminClient>,
  session: Stripe.Checkout.Session
) {
  const subscriptionId = session.subscription as string | null;
  const customerId = session.customer as string | null;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const businessName = (session.metadata?.business_name || "Novo Estabelecimento").trim();

  if (!subscriptionId || !customerId || !email) return;

  // Reentrega do webhook (Stripe pode repetir eventos): não duplica o tenant.
  const { data: already } = await admin
    .from("tenants")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (already) return;

  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const slug = await uniqueSlug(admin, businessName);

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({
      slug,
      name: businessName,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    })
    .select("id")
    .single();
  if (tenantError || !tenant) return;

  await admin.from("loyalty_programs").insert({
    tenant_id: tenant.id,
    name: "Cartão Fidelidade",
    stamps_required: 10,
    reward_description: "Uma recompensa especial para o cliente fiel!",
  });

  const { data: invited } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: businessName, tenant_id: tenant.id },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/admin`,
  });

  if (invited?.user) {
    // Vínculo de admin é N:N (tenant_admins) — não sobrescreve tenant_id do
    // profile, então o mesmo e-mail continua admin de outros estabelecimentos
    // que já tivesse.
    await admin
      .from("tenant_admins")
      .upsert({ tenant_id: tenant.id, user_id: invited.user.id }, { onConflict: "tenant_id,user_id" });
    await admin.from("profiles").update({ role: "admin" }).eq("id", invited.user.id);
  }
}

async function uniqueSlug(
  admin: ReturnType<typeof createAdminClient>,
  name: string
): Promise<string> {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos (á, ã, ç, ...)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "estabelecimento";

  let slug = base;
  let suffix = 1;
  while (true) {
    const { data } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}
