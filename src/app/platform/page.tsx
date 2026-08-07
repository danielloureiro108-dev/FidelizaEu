import { createClient } from "@/lib/supabase/server";
import { PlatformPanel } from "@/components/PlatformPanel";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const supabase = createClient();
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select(
      "id, slug, name, custom_domain, logo_url, color_primary, color_secondary, subscription_status"
    )
    .order("created_at", { ascending: true });

  if (error) {
    // Erro real de banco (ex.: coluna faltando por migration pendente) —
    // melhor mostrar o problema do que uma lista vazia enganosa.
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Não foi possível carregar os estabelecimentos: {error.message}
      </p>
    );
  }

  return (
    <PlatformPanel
      tenants={tenants ?? []}
      rootDomain={process.env.ROOT_DOMAIN ?? ""}
    />
  );
}
