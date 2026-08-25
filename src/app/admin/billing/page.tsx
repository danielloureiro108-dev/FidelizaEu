import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenant } from "@/lib/tenant";
import { BillingPanel } from "@/components/BillingPanel";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/billing");

  const activeTenant = await getActiveTenant();
  const { data: isAdmin } = activeTenant
    ? await supabase.rpc("is_admin_of", { p_tenant: activeTenant.id })
    : { data: false };

  if (!isAdmin || !activeTenant) redirect("/cartao");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, subscription_status, trial_ends_at, plan")
    .eq("id", activeTenant.id)
    .maybeSingle();

  return <BillingPanel tenant={tenant} />;
}
