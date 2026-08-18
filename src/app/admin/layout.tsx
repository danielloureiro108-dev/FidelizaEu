import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { AdminNav } from "@/components/AdminNav";
import { getActiveTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const BILLING_WARNING: Record<string, string> = {
  past_due: "Não conseguimos confirmar seu último pagamento.",
  unpaid: "Não conseguimos confirmar seu último pagamento.",
  canceled: "Sua assinatura foi cancelada.",
};

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

  const [{ data: profile }, tenant] = await Promise.all([
    supabase.from("profiles").select("role, tenant_id").eq("id", user.id).maybeSingle(),
    getActiveTenant(),
  ]);

  // Precisa ser admin E vinculado a ESTE estabelecimento (o resolvido pelo
  // host) — role="admin" sozinho não basta, senão um admin de outro tenant
  // (ou um ex-admin cujo papel ainda não foi revogado em todo lugar)
  // acessaria a tela de admin de qualquer slug.
  if (profile?.role !== "admin" || !tenant || profile.tenant_id !== tenant.id) {
    redirect("/cartao");
  }

  let billingWarning: string | null = null;
  if (tenant) {
    const { data: billing } = await supabase
      .from("tenants")
      .select("subscription_status")
      .eq("id", tenant.id)
      .maybeSingle();
    billingWarning = billing ? BILLING_WARNING[billing.subscription_status] ?? null : null;
  }

  return (
    <div className="mx-auto min-h-dvh max-w-3xl bg-neutral-50">
      <AppHeader name={tenant?.name ?? "Admin"} logoUrl={tenant?.logo_url} />
      <AdminNav />
      {billingWarning && (
        <Link
          href="/admin/billing"
          className="block bg-amber-50 px-5 py-2.5 text-center text-sm font-medium text-amber-800 transition hover:bg-amber-100"
        >
          {billingWarning} Toque para resolver na página de Assinatura.
        </Link>
      )}
      <main className="animate-fade-in-up px-5 py-6">{children}</main>
    </div>
  );
}
