import type { Tenant } from "@/lib/tenant";

// Injeta as cores/fontes do estabelecimento como CSS variables no <html>.
// Renderizado no servidor => sem "flash" de tema errado.
export function BrandStyle({ tenant }: { tenant: Tenant | null }) {
  if (!tenant) return null;
  const css = `:root{
    --brand-primary:${tenant.color_primary};
    --brand-secondary:${tenant.color_secondary};
    --brand-accent:${tenant.color_accent};
    --brand-ink:${tenant.color_ink};
    --font-display:${tenant.font_display};
    --font-sans:${tenant.font_sans};
  }`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
