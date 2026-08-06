"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ui } from "@/lib/ui";
import { rgbToHex, hexToRgb } from "@/lib/color";

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  custom_domain: string | null;
  logo_url: string | null;
  color_primary: string;
  color_secondary: string;
};

type AdminRow = {
  id: string;
  email: string;
  full_name: string | null;
};

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </svg>
  );
}

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    custom_domain: "",
    logo_url: "",
    primary: "#1a235c",
    secondary: "#d4a017",
    stamps: 10,
    reward: "",
  });
  const [editAdmins, setEditAdmins] = useState<AdminRow[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);

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
    else {
      setMsg("Admin nomeado com sucesso.");
      if (editingId === ga.tenantId) loadAdmins(ga.tenantId);
    }
  }

  async function loadAdmins(tenantId: string) {
    const { data } = await supabase.rpc("list_tenant_admins", { p_tenant: tenantId });
    setEditAdmins((data as AdminRow[]) ?? []);
  }

  async function openEdit(t: TenantRow) {
    setEditingId(t.id);
    setEditMsg(null);
    setEditForm({
      name: t.name,
      slug: t.slug,
      custom_domain: t.custom_domain ?? "",
      logo_url: t.logo_url ?? "",
      primary: rgbToHex(t.color_primary),
      secondary: rgbToHex(t.color_secondary),
      stamps: 10,
      reward: "",
    });
    setEditAdmins([]);
    setEditLoading(true);
    try {
      const [{ data: program }] = await Promise.all([
        supabase
          .from("loyalty_programs")
          .select("stamps_required, reward_description")
          .eq("tenant_id", t.id)
          .eq("active", true)
          .maybeSingle(),
        loadAdmins(t.id),
      ]);
      if (program) {
        setEditForm((f) => ({
          ...f,
          stamps: program.stamps_required,
          reward: program.reward_description,
        }));
      }
    } catch (err: any) {
      setEditMsg(err.message ?? "Não foi possível carregar os dados do estabelecimento.");
    } finally {
      setEditLoading(false);
    }
  }

  function closeEdit() {
    setEditingId(null);
    setEditMsg(null);
  }

  async function saveEdit() {
    if (!editingId) return;
    setEditBusy(true);
    setEditMsg(null);
    const { error } = await supabase.rpc("update_tenant", {
      p_id: editingId,
      p_name: editForm.name,
      p_slug: editForm.slug.trim().toLowerCase(),
      p_custom_domain: editForm.custom_domain.trim() || null,
      p_logo_url: editForm.logo_url.trim() || null,
      p_color_primary: hexToRgb(editForm.primary),
      p_color_secondary: hexToRgb(editForm.secondary),
      p_stamps_required: editForm.stamps,
      p_reward: editForm.reward,
    });
    setEditBusy(false);
    if (error) {
      setEditMsg(`Erro: ${error.message}`);
    } else {
      router.refresh();
      closeEdit();
    }
  }

  async function removeTenant(t: TenantRow) {
    if (!window.confirm(`Remover "${t.name}"? Isso apaga o estabelecimento, seus cartões e histórico. Essa ação não pode ser desfeita.`)) {
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc("delete_tenant", { p_id: t.id });
    setBusy(false);
    if (error) setMsg(`Erro: ${error.message}`);
    else {
      if (editingId === t.id) closeEdit();
      router.refresh();
    }
  }

  async function revokeAdmin(admin: AdminRow) {
    if (!editingId) return;
    if (!window.confirm(`Remover acesso de admin de ${admin.email}?`)) return;
    setEditBusy(true);
    const { error } = await supabase.rpc("revoke_admin", { p_user_id: admin.id });
    setEditBusy(false);
    if (error) setEditMsg(`Erro: ${error.message}`);
    else loadAdmins(editingId);
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
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <Fragment key={t.id}>
                  <tr className="border-t border-neutral-100 transition hover:bg-neutral-50">
                    <td className="px-3 py-2 font-medium">{t.name}</td>
                    <td className="px-3 py-2 text-neutral-500">
                      {t.custom_domain
                        ? t.custom_domain
                        : rootDomain
                        ? `${t.slug}.${rootDomain}`
                        : t.slug}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => (editingId === t.id ? closeEdit() : openEdit(t))}
                          title="Editar estabelecimento"
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-brand-primary hover:text-brand-primary"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          onClick={() => removeTenant(t)}
                          disabled={busy}
                          title="Remover estabelecimento"
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-red-400 hover:text-red-500 disabled:opacity-50"
                        >
                          <MinusIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === t.id && (
                    <tr className="border-t border-neutral-100 bg-neutral-50/60">
                      <td colSpan={3} className="px-3 py-4">
                        {editLoading ? (
                          <p className="text-sm text-neutral-500">Carregando...</p>
                        ) : (
                          <div className="space-y-5">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className={ui.label}>Nome</label>
                                <input className={ui.input} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                              </div>
                              <div>
                                <label className={ui.label}>Slug (subdomínio)</label>
                                <input className={ui.input} value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={ui.label}>Domínio próprio (opcional)</label>
                                <input className={ui.input} value={editForm.custom_domain} onChange={(e) => setEditForm({ ...editForm, custom_domain: e.target.value })} />
                              </div>
                              <div className="sm:col-span-2">
                                <label className={ui.label}>URL do logo (opcional)</label>
                                <input className={ui.input} placeholder="https://..." value={editForm.logo_url} onChange={(e) => setEditForm({ ...editForm, logo_url: e.target.value })} />
                              </div>
                              <div>
                                <label className={ui.label}>Cor primária</label>
                                <input type="color" className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-neutral-200 shadow-sm" value={editForm.primary} onChange={(e) => setEditForm({ ...editForm, primary: e.target.value })} />
                              </div>
                              <div>
                                <label className={ui.label}>Cor secundária</label>
                                <input type="color" className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-neutral-200 shadow-sm" value={editForm.secondary} onChange={(e) => setEditForm({ ...editForm, secondary: e.target.value })} />
                              </div>
                              <div>
                                <label className={ui.label}>Carimbos para ganhar</label>
                                <input type="number" min={1} className={ui.input} value={editForm.stamps} onChange={(e) => setEditForm({ ...editForm, stamps: +e.target.value })} />
                              </div>
                              <div>
                                <label className={ui.label}>Recompensa</label>
                                <input className={ui.input} value={editForm.reward} onChange={(e) => setEditForm({ ...editForm, reward: e.target.value })} />
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <button onClick={saveEdit} disabled={editBusy} className={ui.btnPrimary}>
                                {editBusy ? "Salvando..." : "Salvar alterações"}
                              </button>
                              <button onClick={closeEdit} className={ui.btnSecondary}>
                                Cancelar
                              </button>
                              {editMsg && <span className="text-sm text-neutral-600">{editMsg}</span>}
                            </div>

                            <div className="border-t border-neutral-200 pt-4">
                              <p className={ui.label}>Admins vinculados</p>
                              {editAdmins.length === 0 ? (
                                <p className="mt-2 text-sm text-neutral-400">Nenhum admin nomeado ainda.</p>
                              ) : (
                                <ul className="mt-2 space-y-1.5">
                                  {editAdmins.map((a) => (
                                    <li key={a.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">
                                      <span>
                                        {a.full_name ? `${a.full_name} — ` : ""}
                                        {a.email}
                                      </span>
                                      <button
                                        onClick={() => revokeAdmin(a)}
                                        disabled={editBusy}
                                        title="Despromover admin"
                                        className="flex h-6 w-6 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:border-red-400 hover:text-red-500 disabled:opacity-50"
                                      >
                                        <MinusIcon />
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
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
