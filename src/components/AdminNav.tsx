"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/qrcode", label: "QR do dia" },
  { href: "/admin/config", label: "Configurações" },
  { href: "/admin/billing", label: "Assinatura" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-neutral-200/70 px-5">
      {TABS.map((tab) => {
        const active =
          tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative px-3 py-3 text-sm font-medium transition ${
              active ? "text-brand-primary" : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
