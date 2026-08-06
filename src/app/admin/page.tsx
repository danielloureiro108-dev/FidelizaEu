import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveTenant, getActiveProgram } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createClient();
  const tenant = await getActiveTenant();
  const program = tenant ? await getActiveProgram(tenant.id) : null;

  // Início do dia (America/Sao_Paulo) em ISO para filtrar carimbos de hoje.
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [{ count: customers }, { count: stampsToday }, { count: pendingRewards }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
      supabase
        .from("stamps")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay.toISOString()),
      supabase
        .from("rewards")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ]);

  const cards = [
    { label: "Clientes cadastrados", value: customers ?? 0 },
    { label: "Carimbos hoje", value: stampsToday ?? 0 },
    { label: "Recompensas a resgatar", value: pendingRewards ?? 0 },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-primary">
        Olá, {tenant?.name}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Programa: {program?.name} — a cada {program?.stamps_required} carimbos,{" "}
        {program?.reward_description}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-card border border-neutral-200 p-4">
            <p className="font-display text-3xl font-bold text-brand-primary">
              {c.value}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/qrcode"
          className="rounded-card bg-brand-primary p-5 text-white transition hover:opacity-90"
        >
          <p className="font-display text-lg font-bold">Exibir QR do dia</p>
          <p className="mt-1 text-sm text-white/80">
            Coloque numa tela no balcão para os clientes carimbarem.
          </p>
        </Link>
        <Link
          href="/admin/config"
          className="rounded-card border border-neutral-200 p-5 transition hover:bg-neutral-50"
        >
          <p className="font-display text-lg font-bold text-brand-primary">
            Marca e estratégia
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Cores, logo, meta de carimbos e recompensa.
          </p>
        </Link>
      </div>
    </div>
  );
}
