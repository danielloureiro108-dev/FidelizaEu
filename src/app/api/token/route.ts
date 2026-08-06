import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { currentToken } from "@/lib/token";

// Retorna o token atual do QR. Restrito a admin do tenant — assim ninguém
// consegue gerar o QR de casa e burlar o carimbo presencial.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || !profile.tenant_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: tenant } = await admin
    .from("tenants")
    .select("slug, stamp_secret")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  const { data: program } = await admin
    .from("loyalty_programs")
    .select("token_rotation_secs")
    .eq("tenant_id", profile.tenant_id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!tenant?.stamp_secret || !program) {
    return NextResponse.json({ error: "no_program" }, { status: 400 });
  }

  const rotation = program.token_rotation_secs;
  const token = currentToken(tenant.stamp_secret, rotation);
  // Segundos restantes até a próxima rotação (para o countdown no front).
  const remaining = rotation - (Math.floor(Date.now() / 1000) % rotation);

  return NextResponse.json({ token, slug: tenant.slug, rotationSecs: rotation, remaining });
}
