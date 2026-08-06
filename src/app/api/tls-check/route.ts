import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Usado pelo Caddy (on-demand TLS): antes de emitir um certificado para um
 * domínio, ele pergunta aqui se o domínio é de um estabelecimento válido.
 * Responde 200 (pode emitir) ou 404 (recusa) — evita abuso de emissão.
 */
export async function GET(request: Request) {
  const domain = new URL(request.url).searchParams.get("domain")?.toLowerCase();
  if (!domain) return new NextResponse("no domain", { status: 400 });

  const root = (process.env.ROOT_DOMAIN || "").toLowerCase();

  // Subdomínio do root: <slug>.<root> — precisa existir um tenant com esse slug.
  if (root && domain.endsWith(`.${root}`)) {
    const slug = domain.slice(0, -(root.length + 1)).split(".")[0];
    const admin = createAdminClient();
    const { data } = await admin
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    return data ? new NextResponse("ok") : new NextResponse("no", { status: 404 });
  }

  // Domínio próprio: precisa bater com custom_domain de algum tenant.
  const admin = createAdminClient();
  const { data } = await admin
    .from("tenants")
    .select("id")
    .eq("custom_domain", domain)
    .maybeSingle();
  return data ? new NextResponse("ok") : new NextResponse("no", { status: 404 });
}
