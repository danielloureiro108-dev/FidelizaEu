import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/platform");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_super_admin) redirect("/");

  return (
    <div className="mx-auto min-h-dvh max-w-3xl">
      <header className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <Link href="/platform" className="font-display text-lg font-bold text-brand-primary">
          Plataforma · Fidelidade
        </Link>
        <span className="rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white">
          Super admin
        </span>
      </header>
      <main className="px-5 py-6">{children}</main>
    </div>
  );
}
