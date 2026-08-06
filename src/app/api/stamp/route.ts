import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyToken } from "@/lib/token";

export async function POST(request: Request) {
  // 1) Quem carimba precisa estar logado.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const token: string = body.token || "";
  const tenantSlug: string = body.tenantSlug || "";
  if (!token || !tenantSlug) {
    return NextResponse.json({ ok: false, reason: "invalid_token" }, { status: 400 });
  }

  // 2) O tenant vem do QR (não do perfil): assim o mesmo usuário carimba em
  //    qualquer estabelecimento. Lemos o segredo só no servidor.
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, stamp_secret")
    .eq("slug", tenantSlug)
    .maybeSingle();

  if (!tenant?.stamp_secret) {
    return NextResponse.json({ ok: false, reason: "invalid_token" }, { status: 400 });
  }

  const { data: program } = await admin
    .from("loyalty_programs")
    .select("token_rotation_secs")
    .eq("tenant_id", tenant.id)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!program) {
    return NextResponse.json({ ok: false, reason: "no_program" }, { status: 400 });
  }

  // 3) Token do QR válido para a janela atual?
  const valid = verifyToken(token, tenant.stamp_secret, program.token_rotation_secs);
  if (!valid) {
    return NextResponse.json({ ok: false, reason: "invalid_token" }, { status: 400 });
  }

  // 4) Carimbo atômico (regra "N por dia" + recompensa).
  const { data, error } = await admin.rpc("register_stamp", {
    p_customer: user.id,
    p_tenant: tenant.id,
  });

  if (error) {
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}
