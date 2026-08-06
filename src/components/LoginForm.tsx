"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ui } from "@/lib/ui";

export function LoginForm({
  tenantId,
  tenantName,
  logoUrl,
}: {
  tenantId: string | null;
  tenantName: string;
  logoUrl?: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-senha`,
      });
      if (error) throw error;
      setMsg("Enviamos um link de redefinição para o seu e-mail.");
    } catch (err: any) {
      setMsg(err.message ?? "Algo deu errado. Tente novamente.");
    } finally {
      setLoading(false);
    }
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
          options: {
            // Vincula o novo cliente ao estabelecimento deste domínio.
            data: { full_name: name, tenant_id: tenantId },
            // Sem isto, o link do e-mail de confirmação usa a "Site URL"
            // padrão do projeto Supabase (localhost) em vez deste tenant.
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              next
            )}`,
          },
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

  return (
    <main className="night-sky flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in-up rounded-card bg-white p-7 shadow-2xl ring-1 ring-black/5">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={tenantName} className="mx-auto mb-4 h-14 w-auto object-contain" />
        )}
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-brand-secondary">
          {tenantName}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-brand-primary">
          {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Esqueci minha senha"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === "forgot"
            ? "Informe seu e-mail para receber um link de redefinição."
            : "Acesse seu cartão fidelidade digital."}
        </p>

        {mode === "forgot" ? (
          <form onSubmit={handleForgot} className="mt-6 space-y-3">
            <input
              type="email"
              required
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={ui.input}
            />
            <button type="submit" disabled={loading} className={`${ui.btnPrimary} w-full`}>
              {loading ? "Aguarde..." : "Enviar link de redefinição"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmail} className="mt-6 space-y-3">
            {mode === "signup" && (
              <input
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={ui.input}
              />
            )}
            <input
              type="email"
              required
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={ui.input}
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={ui.input}
            />
            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setMsg(null);
                }}
                className="block text-sm font-medium text-brand-primary underline-offset-2 hover:underline"
              >
                Esqueci minha senha
              </button>
            )}
            <button type="submit" disabled={loading} className={`${ui.btnPrimary} w-full`}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        )}

        {msg && (
          <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
            {msg}
          </p>
        )}

        <button
          onClick={() => {
            setMode(mode === "signup" ? "login" : mode === "forgot" ? "login" : "signup");
            setMsg(null);
          }}
          className="mt-4 w-full text-center text-sm font-medium text-brand-primary underline-offset-2 hover:underline"
        >
          {mode === "signup" ? "Já tem conta? Entrar" : mode === "forgot" ? "Voltar para o login" : "Não tem conta? Cadastre-se"}
        </button>
      </div>
    </main>
  );
}
