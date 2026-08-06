import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenant } from "@/lib/tenant";
import { LandingPage } from "@/components/LandingPage";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Host sem tenant resolvido = domínio da plataforma → landing page.
    // Host de um estabelecimento (subdomínio/domínio próprio) → login direto.
    const tenant = await getActiveTenant();
    if (!tenant) return <LandingPage />;
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_super_admin) redirect("/platform");
  redirect(profile?.role === "admin" ? "/admin" : "/cartao");
}
