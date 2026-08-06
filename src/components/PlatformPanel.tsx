"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  custom_domain: string | null;
};

export function PlatformPanel({
  tenants,
  rootDomain,
}: {
  tenants: TenantRow[];
  rootDomain: string;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [nt, setNt] = useState({
    name: "",
    slug: "",
    custom_domain: "",
    stamps: 10,
    reward: "Uma refeição por conta da casa!",
  });
  const [ga, setGa] = useState({ email: "", tenantId: tenants[0]?.id ?? "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createTenant() {
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("create_tenant", {
      p_name: nt.name,
      p_slug: nt.slug.trim().toLowerCase(),
      p_custom_domain: nt.custom_domain.trim() || null,
      p_stamps_required: nt.stamps,
      p_reward: nt.reward,
    });
    setBusy(false);
    if (error) {
      setMsg(`Erro: ${error.message}`);
    } else {
      setMsg(`Estabelecimento criado (id ${String(data).slice(0, 8)}...).`);
      setNt({ ...nt, name: "", slug: "", custom_domain: "" });
      router.refresh();
    }
  }

  async function grantAdmin() {
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("grant_admin", {
      p_email: ga.email.trim().toLowerCase(),
      p_tenant: ga.tenantId,
    });
    setBusy(false);
    if (error) setMsg(`Erro: ${error.message}`);
    else if (data === false)
      setMsg("Usuário não encontrado. Peça para ele fazer login uma vez primeiro.");
    else setMsg("Admin nomeado com sucesso.");
  }

  const field =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-brand-primary";
  const label = "block text-sm font-medium text-neutral-700";

  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-display text-xl font-bold text-brand-primary">
          Estabelecimentos ({tenants.length})
        </h2>
        <div className="mt-3 overflow-hidden rounded-card border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Endereço</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2 text-neutral-500">
                    {t.custom_domain
                      ? t.custom_domain
                      : rootDomain
                      ? `${t.slug}.${rootDomain}`
                      : t.slug}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-brand-primary">
          Novo estabelecimento
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Nome</label>
            <input className={field} value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} />
          </div>
          <div>
            <label className={label}>Slug (subdomínio)</label>
            <input className={field} placeholder="donario" value={nt.slug} onChange={(e) => setNt({ ...nt, slug: e.target.value })} />
            {rootDomain && nt.slug && (
              <p className="mt-1 text-xs text-neutral-400">
                Ficará em {nt.slug.toLowerCase()}.{rootDomain}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Domínio próprio (opcional)</label>
            <input className={field} placeholder="fidelidade.cliente.com.br" value={nt.custom_domain} onChange={(e) => setNt({ ...nt, custom_domain: e.target.value })} />
          </div>
          <div>
            <label className={label}>Carimbos para ganhar</label>
            <input type="number" min={1} className={field} value={nt.stamps} onChange={(e) => setNt({ ...nt, stamps: +e.target.value })} />
          </div>
          <div>
            <label className={label}>Recompensa</label>
            <input className={field} value={nt.reward} onChange={(e) => setNt({ ...nt, reward: e.target.value })} />
          </div>
        </div>
        <button onClick={createTenant} disabled={busy || !nt.name || !nt.slug} className="mt-4 rounded-full bg-brand-primary px-6 py-2.5 font-semibold text-white disabled:opacity-60">
          Criar estabelecimento
        </button>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-brand-primary">
          Nomear admin
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          O dono precisa ter feito login ao menos uma vez.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>E-mail do dono</label>
            <input className={field} value={ga.email} onChange={(e) => setGa({ ...ga, email: e.target.value })} />
          </div>
          <div>
            <label className={label}>Estabelecimento</label>
            <select className={field} value={ga.tenantId} onChange={(e) => setGa({ ...ga, tenantId: e.target.value })}>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={grantAdmin} disabled={busy || !ga.email || !ga.tenantId} className="mt-4 rounded-full bg-brand-primary px-6 py-2.5 font-semibold text-white disabled:opacity-60">
          Nomear admin
        </button>
      </section>

      {msg && (
        <p className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
          {msg}
        </p>
      )}
    </div>
  );
}
