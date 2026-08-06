"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ui } from "@/lib/ui";

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

  return (
    <div className="animate-fade-in-up space-y-6">
      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.sectionTitle}>
          Estabelecimentos ({tenants.length})
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Endereço</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-t border-neutral-100 transition hover:bg-neutral-50">
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

      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.sectionTitle}>
          Novo estabelecimento
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={ui.label}>Nome</label>
            <input className={ui.input} value={nt.name} onChange={(e) => setNt({ ...nt, name: e.target.value })} />
          </div>
          <div>
            <label className={ui.label}>Slug (subdomínio)</label>
            <input className={ui.input} placeholder="donario" value={nt.slug} onChange={(e) => setNt({ ...nt, slug: e.target.value })} />
            {rootDomain && nt.slug && (
              <p className="mt-1 text-xs text-neutral-400">
                Ficará em {nt.slug.toLowerCase()}.{rootDomain}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className={ui.label}>Domínio próprio (opcional)</label>
            <input className={ui.input} placeholder="fidelidade.cliente.com.br" value={nt.custom_domain} onChange={(e) => setNt({ ...nt, custom_domain: e.target.value })} />
          </div>
          <div>
            <label className={ui.label}>Carimbos para ganhar</label>
            <input type="number" min={1} className={ui.input} value={nt.stamps} onChange={(e) => setNt({ ...nt, stamps: +e.target.value })} />
          </div>
          <div>
            <label className={ui.label}>Recompensa</label>
            <input className={ui.input} value={nt.reward} onChange={(e) => setNt({ ...nt, reward: e.target.value })} />
          </div>
        </div>
        <button onClick={createTenant} disabled={busy || !nt.name || !nt.slug} className={`${ui.btnPrimary} mt-4`}>
          Criar estabelecimento
        </button>
      </section>

      <section className={`${ui.card} p-5 sm:p-6`}>
        <h2 className={ui.sectionTitle}>
          Nomear admin
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          O dono precisa ter feito login ao menos uma vez.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={ui.label}>E-mail do dono</label>
            <input className={ui.input} value={ga.email} onChange={(e) => setGa({ ...ga, email: e.target.value })} />
          </div>
          <div>
            <label className={ui.label}>Estabelecimento</label>
            <select className={ui.input} value={ga.tenantId} onChange={(e) => setGa({ ...ga, tenantId: e.target.value })}>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={grantAdmin} disabled={busy || !ga.email || !ga.tenantId} className={`${ui.btnPrimary} mt-4`}>
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
