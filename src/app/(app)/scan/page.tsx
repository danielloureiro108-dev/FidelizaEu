"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/QrScanner";

type Result =
  | { kind: "success"; stamps: number; required: number; reward?: string | null }
  | { kind: "error"; message: string };

export default function ScanPage() {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [processing, setProcessing] = useState(false);
  const autoHandled = useRef(false);

  // Se a pessoa abriu /scan?t=<slug>&c=<token> pela câmera nativa, carimba direto.
  useEffect(() => {
    if (autoHandled.current) return;
    const qs = new URLSearchParams(window.location.search);
    const c = qs.get("c");
    const t = qs.get("t");
    if (c && t) {
      autoHandled.current = true;
      submitStamp(t, c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extrai slug (t) e token (c) do conteúdo lido — aceita URL ou texto cru.
  function handleDecode(text: string) {
    let token = text.trim();
    let slug = "";
    try {
      const url = new URL(text);
      token = url.searchParams.get("c") ?? token;
      slug = url.searchParams.get("t") ?? "";
    } catch {
      /* não é URL */
    }
    submitStamp(slug, token);
  }

  async function submitStamp(tenantSlug: string, token: string) {
    if (processing) return;
    setProcessing(true);

    if (!tenantSlug || !token) {
      setResult({
        kind: "error",
        message: "QR não reconhecido. Peça o código atual ao estabelecimento.",
      });
      setProcessing(false);
      return;
    }

    try {
      const res = await fetch("/api/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, token }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        const reasons: Record<string, string> = {
          invalid_token: "QR inválido ou expirado. Peça o código atual ao estabelecimento.",
          daily_limit: "Você já carimbou hoje. Volte amanhã!",
          no_program: "Nenhum programa de fidelidade ativo.",
          unauthorized: "Faça login para carimbar.",
        };
        setResult({
          kind: "error",
          message: reasons[data.reason] ?? "Não foi possível carimbar.",
        });
      } else {
        setResult({
          kind: "success",
          stamps: data.stamps,
          required: data.required,
          reward: data.reward_created ? data.reward_code : null,
        });
      }
    } catch {
      setResult({ kind: "error", message: "Falha de conexão. Tente de novo." });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main
      className="night-sky min-h-dvh px-5"
      style={{
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto max-w-md">
        <Link href="/cartao" className="text-sm text-white/80 underline-offset-2 hover:underline">
          ← Voltar ao cartão
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-white">
          Aponte para o QR do estabelecimento
        </h1>
        <p className="mt-1 text-sm text-white/70">
          O código muda a cada minuto — precisa ser o exibido agora no balcão.
        </p>

        <div className="mt-6">
          {!result && <QrScanner onDecode={handleDecode} paused={processing} />}
        </div>

        {result?.kind === "success" && (
          <div className="mt-4 animate-fade-in-up rounded-card bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary/10">
              <span className="font-display text-2xl font-bold text-brand-primary">✓</span>
            </div>
            <p className="mt-3 font-display text-2xl font-bold text-brand-primary">
              Carimbado!
            </p>
            <p className="mt-1 text-neutral-600">
              {result.stamps} de {result.required} carimbos
            </p>
            {result.reward && (
              <div className="mt-4 rounded-lg bg-brand-secondary/20 p-3">
                <p className="font-semibold text-brand-primary">
                  🎉 Você ganhou uma recompensa!
                </p>
                <p className="mt-1 font-mono text-lg font-bold tracking-widest text-brand-primary">
                  {result.reward}
                </p>
              </div>
            )}
            <button
              onClick={() => router.push("/cartao")}
              className="mt-5 w-full rounded-full bg-brand-primary py-3 font-semibold text-white shadow-soft transition hover:opacity-90 active:scale-[0.98]"
            >
              Ver meu cartão
            </button>
          </div>
        )}

        {result?.kind === "error" && (
          <div className="mt-4 animate-fade-in-up rounded-card bg-white p-6 text-center shadow-2xl">
            <p className="text-lg font-semibold text-red-600">{result.message}</p>
            <button
              onClick={() => setResult(null)}
              className="mt-4 w-full rounded-full bg-brand-primary py-3 font-semibold text-white shadow-soft transition hover:opacity-90 active:scale-[0.98]"
            >
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
