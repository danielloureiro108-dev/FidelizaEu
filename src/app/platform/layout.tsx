import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

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
    <div className="mx-auto min-h-dvh max-w-3xl bg-neutral-50">
      {/* Identidade fixa do FidelizaEu (não a do tenant do host) — esta é a
          área da plataforma, não a de um estabelecimento específico. */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200/70 bg-white/80 px-5 py-4 backdrop-blur-md">
        <Link href="/platform">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fidelizaeu-lockup.png" alt="FidelizaEu" className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gradient-to-br from-[#232C68] to-[#1A235C] px-3 py-1 text-xs font-semibold text-white shadow-sm">
            Super admin
          </span>
          <LogoutButton />
        </div>
      </header>
      <main className="animate-fade-in-up px-5 py-6">{children}</main>
    </div>
  );
}
