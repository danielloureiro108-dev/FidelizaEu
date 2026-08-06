import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
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
    <div className="mx-auto min-h-dvh max-w-3xl">
      <AppHeader name={tenant?.name ?? "Admin"} logoUrl={tenant?.logo_url} />
      <nav className="flex gap-1 border-b border-neutral-200 px-5 text-sm">
        <Link href="/admin" className="px-3 py-2 font-medium hover:text-brand-primary">
          Painel
        </Link>
        <Link href="/admin/qrcode" className="px-3 py-2 font-medium hover:text-brand-primary">
          QR do dia
        </Link>
        <Link href="/admin/config" className="px-3 py-2 font-medium hover:text-brand-primary">
          Configurações
        </Link>
      </nav>
      <main className="px-5 py-6">{children}</main>
    </div>
  );
}
