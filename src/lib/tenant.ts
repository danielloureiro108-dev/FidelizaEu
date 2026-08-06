import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Tenant = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  color_primary: string;
  color_secondary: string;
  color_accent: string;
  color_ink: string;
  font_display: string;
  font_sans: string;
  custom_domain: string | null;
};

export type LoyaltyProgram = {
  id: string;
  tenant_id: string;
  name: string;
  stamps_required: number;
  reward_description: string;
  scans_per_day_limit: number;
  token_rotation_secs: number;
  active: boolean;
};

// Não usar "*": a coluna stamp_secret é bloqueada para o cliente.
const TENANT_COLS =
  "id, slug, name, logo_url, color_primary, color_secondary, color_accent, color_ink, font_display, font_sans, custom_domain";

/**
 * Descobre o slug embutido no host.
 *   - domínio próprio  → resolvido por custom_domain (retorna null aqui)
 *   - subdomínio       → "donario.fidelidade.app" com ROOT_DOMAIN "fidelidade.app" → "donario"
 *   - dev              → "donario.localhost:3000" → "donario"
 */
function slugFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  const root = (process.env.ROOT_DOMAIN || "").toLowerCase();

  if (root && hostname.endsWith(`.${root}`)) {
    const sub = hostname.slice(0, -(root.length + 1));
    return sub.split(".")[0] || null; // primeiro rótulo
  }

  // Dev: aceita "<slug>.localhost".
  if (hostname.endsWith(".localhost")) {
    return hostname.split(".")[0] || null;
  }

  return null; // sem ROOT_DOMAIN, tratamos o host como domínio próprio
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tenants")
    .select(TENANT_COLS)
    .eq("slug", slug)
    .maybeSingle();
  return (data as unknown as Tenant) ?? null;
}

export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("tenants")
    .select(TENANT_COLS)
    .eq("custom_domain", domain)
    .maybeSingle();
  return (data as unknown as Tenant) ?? null;
}

/**
 * Tenant ativo desta requisição, resolvido pelo host:
 *   1) domínio próprio (custom_domain)
 *   2) subdomínio (slug + ROOT_DOMAIN)
 *   3) fallback: TENANT_SLUG do ambiente, senão o primeiro cadastrado.
 */
export async function getActiveTenant(): Promise<Tenant | null> {
  const host = headers().get("host");
  const hostname = host?.split(":")[0].toLowerCase() ?? null;

  // 1) domínio próprio
  if (hostname && !["localhost", "127.0.0.1"].includes(hostname)) {
    const byDomain = await getTenantByDomain(hostname);
    if (byDomain) return byDomain;
  }

  // 2) subdomínio: o host aponta explicitamente para um slug, então NUNCA
  // cai no fallback genérico abaixo — se o estabelecimento não existir
  // (ex.: foi excluído), retorna null em vez de mostrar outro tenant.
  const slug = slugFromHost(host);
  if (slug) {
    return await getTenantBySlug(slug);
  }

  // 3) fallback (deploy single-tenant / dev): só roda quando o host não
  // identifica nenhum domínio próprio nem slug de subdomínio.
  //    Com ROOT_DOMAIN definido (multi-tenant), um host sem tenant é o
  //    domínio da própria plataforma (landing page) — não "empresta" a marca
  //    do primeiro estabelecimento cadastrado.
  if (process.env.ROOT_DOMAIN) return null;

  const envSlug = process.env.TENANT_SLUG;
  const supabase = createClient();
  const query = supabase.from("tenants").select(TENANT_COLS);
  const { data } = envSlug
    ? await query.eq("slug", envSlug).maybeSingle()
    : await query.order("created_at", { ascending: true }).limit(1).maybeSingle();
  return (data as unknown as Tenant) ?? null;
}

export async function getActiveProgram(
  tenantId: string
): Promise<LoyaltyProgram | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as LoyaltyProgram) ?? null;
}
