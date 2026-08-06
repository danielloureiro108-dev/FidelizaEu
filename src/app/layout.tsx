import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getActiveTenant } from "@/lib/tenant";
import { BrandStyle } from "@/components/BrandProvider";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getActiveTenant();
  return {
    title: tenant?.name ?? "Cartão Fidelidade",
    description: "Acumule e ganhe!",
  };
}

export const viewport: Viewport = {
  themeColor: "#1a235c",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getActiveTenant();
  return (
    <html lang="pt-BR">
      <head>
        <BrandStyle tenant={tenant} />
      </head>
      <body className="min-h-dvh bg-neutral-50">{children}</body>
    </html>
  );
}
