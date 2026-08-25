import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getActiveTenant } from "@/lib/tenant";
import { currentToken } from "@/lib/token";

// Retorna o token atual do QR. Restrito a admin DESTE tenant (resolvido pelo
// host) — assim ninguém consegue gerar o QR de casa e burlar o carimbo
// presencial, e um mesmo e-mail admin de vários slugs só gera o QR do slug
// que está acessando no momento.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const tenant = await getActiveTenant();
  const { data: isAdmin } = tenant
    ? await supabase.rpc("is_admin_of", { p_tenant: tenant.id })
    : { data: false };

  if (!tenant || !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: tenantRow } = await admin
    .from("tenants")
    .select("slug, stamp_secret")
    .eq("id", tenant.id)
    .maybeSingle();

  const { data: program } = await admin
    .from("loyalty_programs")
    .select("token_rotation_secs")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!tenantRow?.stamp_secret || !program) {
    return NextResponse.json({ error: "no_program" }, { status: 400 });
  }

  const rotation = program.token_rotation_secs;
  const token = currentToken(tenantRow.stamp_secret, rotation);
  // Segundos restantes até a próxima rotação (para o countdown no front).
  const remaining = rotation - (Math.floor(Date.now() / 1000) % rotation);

  return NextResponse.json({ token, slug: tenantRow.slug, rotationSecs: rotation, remaining });
}
