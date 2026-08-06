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
      boxShadow: {
        soft: "0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -10px rgba(16, 24, 40, 0.12)",
        lift: "0 2px 4px rgba(16, 24, 40, 0.04), 0 16px 40px -12px rgba(16, 24, 40, 0.18)",
        glow: "0 0 0 1px rgb(var(--brand-primary) / 0.06), 0 12px 32px -12px rgb(var(--brand-primary) / 0.35)",
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, rgb(var(--brand-primary)), rgb(var(--brand-primary) / 0.85) 55%, rgb(var(--brand-secondary) / 0.9))",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
