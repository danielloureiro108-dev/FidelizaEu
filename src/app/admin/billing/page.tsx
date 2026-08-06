import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BillingPanel } from "@/components/BillingPanel";

export const dynamic = "force-dynamic";

export default async function AdminBillingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/billing");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" || !profile.tenant_id) redirect("/cartao");

  const { data: tenant } = await supabase
    .from("tenants")
    .select("name, subscription_status, trial_ends_at, plan")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  return <BillingPanel tenant={tenant} />;
}
