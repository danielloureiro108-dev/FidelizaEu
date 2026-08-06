// Classes compartilhadas para manter inputs, botões e cards consistentes
// em todas as telas — só as cores de marca variam (via CSS variables).
export const ui = {
  input:
    "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10",
  label: "block text-sm font-medium text-neutral-700",
  card: "rounded-card border border-neutral-200/80 bg-white shadow-soft",
  sectionTitle: "font-display text-xl font-bold text-brand-primary",
  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-2.5 font-semibold text-white shadow-soft transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
  btnSecondary:
    "inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-6 py-2.5 font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
} as const;
