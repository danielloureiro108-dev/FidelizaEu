import type { Config } from "tailwindcss";

/**
 * As cores da marca vêm de CSS variables (definidas em runtime pelo BrandProvider
 * a partir do que o estabelecimento configurou no banco). Isso é o coração do
 * white-label: o mesmo build atende marcas diferentes só trocando as variáveis.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(var(--brand-primary) / <alpha-value>)",
          primary: "rgb(var(--brand-primary) / <alpha-value>)",
          secondary: "rgb(var(--brand-secondary) / <alpha-value>)",
          accent: "rgb(var(--brand-accent) / <alpha-value>)",
          ink: "rgb(var(--brand-ink) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
