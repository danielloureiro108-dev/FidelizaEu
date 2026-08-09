import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getActiveTenant } from "@/lib/tenant";
import { BrandStyle } from "@/components/BrandProvider";
import { PwaRegister } from "@/components/PwaRegister";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getActiveTenant();
  return {
    title: tenant?.name ?? "FidelizaEu — Cartão fidelidade digital para o seu negócio",
    description: tenant
      ? "Acumule e ganhe!"
      : "Cartão fidelidade digital com QR anti-fraude e a cara do seu estabelecimento.",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: tenant?.name ?? "FidelizaEu",
    },
    icons: {
      icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
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
      <body className="min-h-dvh bg-neutral-50">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
