"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ui } from "@/lib/ui";

type PendingReward = {
  id: string;
  description: string;
  code: string;
  created_at: string;
};

const REASON_MESSAGES: Record<string, string> = {
  not_found: "Código não encontrado para este estabelecimento.",
  already_redeemed: "Essa recompensa já foi resgatada antes.",
};

export function RedeemPanel({
  tenantId,
  pending,
}: {
  tenantId: string;
  pending: PendingReward[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setResult(null);

    const { data, error } = await supabase.rpc("redeem_reward", {
      p_tenant: tenantId,
      p_code: code.trim(),
    });

    setBusy(false);
    if (error) {
      setResult({ ok: false, message: `Erro: ${error.message}` });
      return;
    }
    if (!data.ok) {
      setResult({ ok: false, message: REASON_MESSAGES[data.reason] ?? "Não foi possível resgatar." });
      return;
    }

    setResult({ ok: true, message: `Resgatado: ${data.description}` });
    setCode("");
    router.refresh();
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.sectionTitle}>Resgatar recompensa</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Digite (ou confira) o código que o cliente mostra na tela dele.
        </p>
        <form onSubmit={redeem} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            className={`${ui.input} font-mono uppercase tracking-widest sm:flex-1`}
            placeholder="Código"
            value={code}
            maxLength={12}
            autoFocus
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={busy || !code.trim()} className={ui.btnPrimary}>
            {busy ? "Verificando..." : "Confirmar resgate"}
          </button>
        </form>
        {result && (
          <p
            className={`mt-3 rounded-lg px-3 py-2 text-sm ${
              result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {result.message}
          </p>
        )}
      </section>

      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.sectionTitle}>Pendentes ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">Nenhuma recompensa pendente.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-700">{r.description}</p>
                  <p className="text-xs text-neutral-400">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCode(r.code)}
                  title="Preencher o código acima"
                  className="rounded bg-neutral-100 px-2 py-1 font-mono text-sm font-bold tracking-widest text-neutral-700 transition hover:bg-brand-primary hover:text-white"
                >
                  {r.code}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
