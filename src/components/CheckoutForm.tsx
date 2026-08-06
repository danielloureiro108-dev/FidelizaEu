"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ui } from "@/lib/ui";

export function CheckoutForm() {
  const params = useSearchParams();
  const canceled = params.get("cancelado") === "1";

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Algo deu errado.");
      window.location.href = data.url;
    } catch (err: any) {
      setMsg(err.message ?? "Não foi possível iniciar a assinatura.");
      setLoading(false);
    }
  }

  return (
    <main className="night-sky flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in-up rounded-card bg-white p-7 shadow-2xl ring-1 ring-black/5">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-brand-secondary">
          FidelizaEu
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-brand-primary">
          Começar teste grátis
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          14 dias grátis, depois R$ 97/mês. Cancele quando quiser.
        </p>

        {canceled && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Assinatura não concluída. Pode tentar de novo quando quiser.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="text"
            required
            placeholder="Nome do estabelecimento"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={ui.input}
          />
          <input
            type="email"
            required
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={ui.input}
          />
          <button type="submit" disabled={loading} className={`${ui.btnPrimary} w-full`}>
            {loading ? "Aguarde..." : "Ir para o pagamento"}
          </button>
        </form>

        {msg && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>
        )}

        <p className="mt-4 text-center text-xs text-neutral-400">
          Você será redirecionado para o Stripe, nosso parceiro de pagamentos.
        </p>
      </div>
    </main>
  );
}
