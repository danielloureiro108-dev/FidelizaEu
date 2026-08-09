"use client";

import { LogoutButton } from "@/components/LogoutButton";

export function AppHeader({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200/70 bg-white/80 px-5 py-4 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={name} className="h-9 w-auto" />
        ) : (
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-sm">
              {name.charAt(0).toUpperCase()}
            </span>
            <span className="font-display text-lg font-bold text-brand-primary">
              {name}
            </span>
          </>
        )}
      </div>
      <LogoutButton />
    </header>
  );
}
