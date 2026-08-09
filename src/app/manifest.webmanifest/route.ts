import { NextResponse } from "next/server";
import { getActiveTenant } from "@/lib/tenant";
import { rgbToHex } from "@/lib/color";

export const dynamic = "force-dynamic";

// Manifest por estabelecimento: cada domínio/subdomínio instala um app com
// o próprio nome e cor, resolvidos pelo host da requisição (getActiveTenant).
export async function GET() {
  const tenant = await getActiveTenant();

  const name = tenant?.name ?? "FidelizaEu";
  const themeColor = tenant ? rgbToHex(tenant.color_primary) : "#1a235c";

  // Logo do próprio estabelecimento vira o ícone do app instalado; sem logo
  // cadastrado, cai no ícone genérico da plataforma.
  const icons = tenant?.logo_url
    ? [
        { src: tenant.logo_url, sizes: "512x512", purpose: "any" },
        { src: tenant.logo_url, sizes: "512x512", purpose: "maskable" },
      ]
    : [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];

  const manifest = {
    name,
    short_name: name.length > 12 ? `${name.slice(0, 12)}…` : name,
    description: "Cartão fidelidade digital",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: themeColor,
    icons,
  };

  return NextResponse.json(manifest, {
    headers: { "Content-Type": "application/manifest+json" },
  });
}
