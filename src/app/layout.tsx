import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getActiveTenant } from "@/lib/tenant";
import { BrandStyle } from "@/components/BrandProvider";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getActiveTenant();
  return {
    title: tenant?.name ?? "FidelizaEu — Cartão fidelidade digital para o seu negócio",
    description: tenant
      ? "Acumule e ganhe!"
      : "Cartão fidelidade digital com QR anti-fraude e a cara do seu estabelecimento.",
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
