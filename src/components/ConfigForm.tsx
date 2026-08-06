"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tenant, LoyaltyProgram } from "@/lib/tenant";

// "26 35 92" <-> "#1a235c"
function rgbToHex(rgb: string): string {
  const [r, g, b] = rgb.split(" ").map((n) => parseInt(n, 10) || 0);
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}
function hexToRgb(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function ConfigForm({
  tenant,
  program,
}: {
  tenant: Tenant;
  program: LoyaltyProgram;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [t, setT] = useState({
    name: tenant.name,
    logo_url: tenant.logo_url ?? "",
    primary: rgbToHex(tenant.color_primary),
    secondary: rgbToHex(tenant.color_secondary),
    accent: rgbToHex(tenant.color_accent),
    font_display: tenant.font_display,
  });
  const [p, setP] = useState({
    name: program.name,
    stamps_required: program.stamps_required,
    reward_description: program.reward_description,
    scans_per_day_limit: program.scans_per_day_limit,
    token_rotation_secs: program.token_rotation_secs,
  });

  async function save() {
    setSaving(true);
    setMsg(null);

    const { error: e1 } = await supabase
      .from("tenants")
      .update({
        name: t.name,
        logo_url: t.logo_url || null,
        color_primary: hexToRgb(t.primary),
        color_secondary: hexToRgb(t.secondary),
        color_accent: hexToRgb(t.accent),
        font_display: t.font_display,
      })
      .eq("id", tenant.id);

    const { error: e2 } = await supabase
      .from("loyalty_programs")
      .update({
        name: p.name,
        stamps_required: p.stamps_required,
        reward_description: p.reward_description,
        scans_per_day_limit: p.scans_per_day_limit,
        token_rotation_secs: p.token_rotation_secs,
      })
      .eq("id", program.id);

    setSaving(false);
    if (e1 || e2) {
      setMsg("Erro ao salvar. Verifique se você é admin deste estabelecimento.");
    } else {
      setMsg("Salvo! As mudanças de marca aparecem ao recarregar.");
      router.refresh();
    }
  }

  const field = "w-full rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-brand-primary";
  const label = "block text-sm font-medium text-neutral-700";

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-display text-xl font-bold text-brand-primary">Marca</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Nome do estabelecimento</label>
            <input className={field} value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
          </div>
          <div>
            <label className={label}>URL do logo (opcional)</label>
            <input className={field} placeholder="https://..." value={t.logo_url} onChange={(e) => setT({ ...t, logo_url: e.target.value })} />
          </div>
          <div>
            <label className={label}>Cor primária</label>
            <input type="color" className="mt-1 h-10 w-full rounded-lg border border-neutral-300" value={t.primary} onChange={(e) => setT({ ...t, primary: e.target.value })} />
          </div>
          <div>
            <label className={label}>Cor secundária</label>
            <input type="color" className="mt-1 h-10 w-full rounded-lg border border-neutral-300" value={t.secondary} onChange={(e) => setT({ ...t, secondary: e.target.value })} />
          </div>
          <div>
            <label className={label}>Fonte de destaque (CSS font-family)</label>
            <input className={field} value={t.font_display} onChange={(e) => setT({ ...t, font_display: e.target.value })} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-brand-primary">Estratégia</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Nome do programa</label>
            <input className={field} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} />
          </div>
          <div>
            <label className={label}>Carimbos para ganhar</label>
            <input type="number" min={1} className={field} value={p.stamps_required} onChange={(e) => setP({ ...p, stamps_required: +e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Descrição da recompensa</label>
            <input className={field} value={p.reward_description} onChange={(e) => setP({ ...p, reward_description: e.target.value })} />
          </div>
          <div>
            <label className={label}>Carimbos por dia (máx.)</label>
            <input type="number" min={1} className={field} value={p.scans_per_day_limit} onChange={(e) => setP({ ...p, scans_per_day_limit: +e.target.value })} />
          </div>
          <div>
            <label className={label}>Rotação do QR (segundos)</label>
            <input type="number" min={10} className={field} value={p.token_rotation_secs} onChange={(e) => setP({ ...p, token_rotation_secs: +e.target.value })} />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rounded-full bg-brand-primary px-6 py-2.5 font-semibold text-white disabled:opacity-60">
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
        {msg && <span className="text-sm text-neutral-600">{msg}</span>}
      </div>
    </div>
  );
}
