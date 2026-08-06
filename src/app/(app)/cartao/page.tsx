import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenant, getActiveProgram } from "@/lib/tenant";
import { LoyaltyCard } from "@/components/LoyaltyCard";
import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default async function CartaoPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tenant = await getActiveTenant();
  const program = tenant ? await getActiveProgram(tenant.id) : null;

  // Garante que o usuário tenha cartão NESTE estabelecimento (multi-tenant).
  if (tenant) {
    await supabase.rpc("attach_customer", { p_tenant: tenant.id });
  }

  const { data: card } = program
    ? await supabase
        .from("cards")
        .select("stamps, completed_count")
        .eq("customer_id", user!.id)
        .eq("program_id", program.id)
        .maybeSingle()
    : { data: null };

  const { data: rewards } = tenant
    ? await supabase
        .from("rewards")
        .select("id, description, code, status, created_at")
        .eq("customer_id", user!.id)
        .eq("tenant_id", tenant.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
    : { data: [] };

  const stamps = card?.stamps ?? 0;
  const required = program?.stamps_required ?? 10;
  const rewardText = program?.reward_description ?? "Uma refeição grátis!";

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-neutral-50">
      <AppHeader name={tenant?.name ?? "Fidelidade"} logoUrl={tenant?.logo_url} />

      <main className="px-5 py-5 pb-24">
        <LoyaltyCard stamps={stamps} required={required} rewardText={rewardText} />

        {rewards && rewards.length > 0 && (
          <div className="mt-5 animate-fade-in-up rounded-card border-2 border-brand-secondary bg-brand-secondary/10 p-4 shadow-soft">
            <p className="font-display text-lg font-bold text-brand-primary">
              🎉 Você tem {rewards.length} recompensa
              {rewards.length > 1 ? "s" : ""}!
            </p>
            {rewards.map((r) => (
              <div
                key={r.id}
                className="mt-2 flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm"
              >
                <span className="text-sm text-neutral-700">{r.description}</span>
                <span className="rounded bg-brand-primary px-2 py-1 font-mono text-sm font-bold tracking-widest text-white">
                  {r.code}
                </span>
              </div>
            ))}
            <p className="mt-2 text-xs text-neutral-500">
              Mostre o código no caixa para resgatar.
            </p>
          </div>
        )}

        {card && card.completed_count > 0 && (
          <p className="mt-4 text-center text-sm text-neutral-500">
            Cartões completados: <strong>{card.completed_count}</strong>
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-neutral-50 via-neutral-50 p-4 pt-8">
        <Link
          href="/scan"
          className="flex items-center justify-center gap-2 rounded-full bg-brand-gradient py-4 font-semibold text-white shadow-lift transition hover:-translate-y-0.5 active:scale-[0.98]"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10" />
          </svg>
          Escanear QR e carimbar
        </Link>
      </div>
    </div>
  );
}
