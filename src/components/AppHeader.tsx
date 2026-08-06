"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AppHeader({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={name} className="h-9 w-auto" />
        ) : (
          <span className="font-display text-lg font-bold text-brand-primary">
            {name}
          </span>
        )}
      </div>
      <button
        onClick={signOut}
        className="text-sm font-medium text-neutral-500 underline"
      >
        Sair
      </button>
    </header>
  );
}
