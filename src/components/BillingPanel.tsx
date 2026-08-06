"use client";

import { useState } from "react";
import { ui } from "@/lib/ui";

type Tenant = {
  name: string;
  subscription_status: string;
  trial_ends_at: string | null;
  plan: string;
} | null;

const STATUS: Record<string, { label: string; className: string }> = {
  trialing: { label: "Teste grátis", className: "bg-blue-50 text-blue-700" },
  active: { label: "Ativa", className: "bg-emerald-50 text-emerald-700" },
  past_due: { label: "Pagamento pendente", className: "bg-amber-50 text-amber-700" },
  unpaid: { label: "Pagamento pendente", className: "bg-amber-50 text-amber-700" },
  canceled: { label: "Cancelada", className: "bg-red-50 text-red-700" },
  incomplete: { label: "Incompleta", className: "bg-neutral-100 text-neutral-600" },
  incomplete_expired: { label: "Expirada", className: "bg-neutral-100 text-neutral-600" },
  inactive: { label: "Sem assinatura", className: "bg-neutral-100 text-neutral-600" },
};

export function BillingPanel({ tenant }: { tenant: Tenant }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não foi possível abrir o portal.");
      window.location.href = data.url;
    } catch (err: any) {
      setMsg(err.message ?? "Algo deu errado. Tente novamente.");
      setLoading(false);
    }
  }

  if (!tenant) {
    return (
      <p className="text-neutral-600">
        Nenhum estabelecimento encontrado.
      </p>
    );
  }

  const status = STATUS[tenant.subscription_status] ?? STATUS.inactive;
  const trialEndsAt = tenant.trial_ends_at ? new Date(tenant.trial_ends_at) : null;

  return (
    <div className="animate-fade-in-up space-y-6">
      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.sectionTitle}>Assinatura</h2>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-neutral-700">Plano mensal</p>
            <p className="text-xs text-neutral-400">R$ 97/mês</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
        </div>

        {tenant.subscription_status === "trialing" && trialEndsAt && (
          <p className="mt-3 text-sm text-neutral-500">
            Seu teste grátis termina em{" "}
            {trialEndsAt.toLocaleDateString("pt-BR")}. A primeira cobrança
            acontece automaticamente depois disso.
          </p>
        )}

        {(tenant.subscription_status === "past_due" ||
          tenant.subscription_status === "unpaid") && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Não conseguimos confirmar seu último pagamento. Atualize a forma
            de pagamento para manter o acesso.
          </p>
        )}

        {tenant.subscription_status === "canceled" && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Sua assinatura foi cancelada. Reative pelo portal de cobrança
            para voltar a usar o painel.
          </p>
        )}

        <button onClick={openPortal} disabled={loading} className={`${ui.btnPrimary} mt-5`}>
          {loading ? "Abrindo..." : "Gerenciar assinatura"}
        </button>
        <p className="mt-2 text-xs text-neutral-400">
          Troque a forma de pagamento, veja faturas ou cancele — tudo pelo
          portal seguro do Stripe.
        </p>

        {msg && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>
        )}
      </section>
    </div>
  );
}
