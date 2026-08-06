"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({
  tenantId,
  tenantName,
}: {
  tenantId: string | null;
  tenantName: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setMsg(null);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          next
        )}`,
      },
    });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          // Vincula o novo cliente ao estabelecimento deste domínio.
          options: { data: { full_name: name, tenant_id: tenantId } },
        });
        if (error) throw error;
        setMsg("Conta criada! Verifique seu e-mail se a confirmação estiver ativa.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err: any) {
      setMsg(err.message ?? "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-lg border border-neutral-300 px-3 py-2.5 outline-none focus:border-brand-primary";

  return (
    <main className="night-sky flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-2xl">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-brand-secondary">
          {tenantName}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-brand-primary">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Acesse seu cartão fidelidade digital.
        </p>

        <button
          onClick={handleGoogle}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 py-2.5 font-medium transition hover:bg-neutral-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
          </svg>
          Continuar com Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-neutral-400">
          <span className="h-px flex-1 bg-neutral-200" /> ou
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={field}
            />
          )}
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-primary py-2.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        {msg && (
          <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            {msg}
          </p>
        )}

        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-4 w-full text-center text-sm text-brand-primary underline"
        >
          {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
