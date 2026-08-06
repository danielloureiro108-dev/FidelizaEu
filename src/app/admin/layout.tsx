import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "@/components/AdminNav";
import { getActiveTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") redirect("/cartao");

  const tenant = await getActiveTenant();

  return (
    <div className="mx-auto min-h-dvh max-w-3xl bg-neutral-50">
      <AppHeader name={tenant?.name ?? "Admin"} logoUrl={tenant?.logo_url} />
      <AdminNav />
      <main className="animate-fade-in-up px-5 py-6">{children}</main>
    </div>
  );
}
