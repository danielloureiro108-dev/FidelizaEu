import { createClient } from "@/lib/supabase/server";
import { PlatformPanel } from "@/components/PlatformPanel";

export const dynamic = "force-dynamic";

export default async function PlatformPage() {
  const supabase = createClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select(
      "id, slug, name, custom_domain, logo_url, color_primary, color_secondary, subscription_status"
    )
    .order("created_at", { ascending: true });

  return (
    <PlatformPanel
      tenants={tenants ?? []}
      rootDomain={process.env.ROOT_DOMAIN ?? ""}
    />
  );
}
