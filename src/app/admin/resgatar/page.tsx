import { createClient } from "@/lib/supabase/server";
import { getActiveTenant } from "@/lib/tenant";
import { RedeemPanel } from "@/components/RedeemPanel";

export const dynamic = "force-dynamic";

export default async function RedeemPage() {
  const supabase = createClient();
  const tenant = await getActiveTenant();

  const { data: pending } = tenant
    ? await supabase
        .from("rewards")
        .select("id, description, code, created_at")
        .eq("tenant_id", tenant.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
    : { data: [] };

  return <RedeemPanel tenantId={tenant?.id ?? ""} pending={pending ?? []} />;
}
