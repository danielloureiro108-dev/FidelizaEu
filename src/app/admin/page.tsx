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
      // Clientes DESTE estabelecimento — via "cards" (quem tem cartão aqui),
      // não "profiles" (que é global e não reflete o tenant "casa" de quem
      // já é cliente de outro lugar).
      supabase
        .from("cards")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant?.id ?? ""),
      supabase
        .from("stamps")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant?.id ?? "")
        .gte("created_at", startOfDay.toISOString()),
      supabase
        .from("rewards")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenant?.id ?? "")
        .eq("status", "pending"),
    ]);

  const cards = [
    {
      label: "Clientes cadastrados",
      value: customers ?? 0,
      icon: (
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 4c1.5.4 3 1.5 3 4v2" />
      ),
    },
    {
      label: "Carimbos hoje",
      value: stampsToday ?? 0,
      icon: <path d="M9 11.5 11.5 14 15 9M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />,
    },
    {
      label: "Recompensas a resgatar",
      value: pendingRewards ?? 0,
      icon: <path d="M20 12v8H4v-8M2 7h20v5H2V7Zm10 0V4a2.5 2.5 0 1 0-2.5 2.5H12Zm0 0V4a2.5 2.5 0 1 1 2.5 2.5H12Zm0 0v13" />,
    },
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

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-card border border-neutral-200/80 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-brand-secondary"
            >
              {c.icon}
            </svg>
            <p className="mt-3 font-display text-3xl font-bold text-brand-primary">
              {c.value}
            </p>
            <p className="mt-1 text-xs text-neutral-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link
          href="/admin/qrcode"
          className="group rounded-card bg-brand-gradient p-5 text-white shadow-glow transition hover:-translate-y-0.5"
        >
          <p className="font-display text-lg font-bold">Exibir QR do dia</p>
          <p className="mt-1 text-sm text-white/80">
            Coloque numa tela no balcão para os clientes carimbarem.
          </p>
        </Link>
        <Link
          href="/admin/resgatar"
          className="rounded-card border border-neutral-200/80 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
        >
          <p className="font-display text-lg font-bold text-brand-primary">
            Resgatar recompensas
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Dê baixa no código que o cliente mostrar no balcão.
          </p>
        </Link>
        <Link
          href="/admin/config"
          className="rounded-card border border-neutral-200/80 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
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
