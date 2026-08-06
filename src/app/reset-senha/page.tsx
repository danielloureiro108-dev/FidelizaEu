"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ui } from "@/lib/ui";

export default function ResetSenhaPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password !== confirm) {
      setMsg("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      setMsg(err.message ?? "Não foi possível redefinir a senha. Peça um novo link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="night-sky flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in-up rounded-card bg-white p-7 shadow-2xl ring-1 ring-black/5">
        <h1 className="font-display text-2xl font-bold text-brand-primary">
          Nova senha
        </h1>

        {done ? (
          <>
            <p className="mt-2 text-sm text-neutral-500">
              Senha atualizada! Você já pode continuar.
            </p>
            <button onClick={() => router.push("/")} className={`${ui.btnPrimary} mt-5 w-full`}>
              Continuar
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-neutral-500">
              Escolha uma nova senha para sua conta.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input
                type="password"
                required
                minLength={6}
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={ui.input}
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Confirme a nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={ui.input}
              />
              <button type="submit" disabled={loading} className={`${ui.btnPrimary} w-full`}>
                {loading ? "Aguarde..." : "Salvar nova senha"}
              </button>
            </form>
            {msg && (
              <p className="mt-3 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
                {msg}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
