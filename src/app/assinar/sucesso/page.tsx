import Link from "next/link";
import { ui } from "@/lib/ui";

export default function AssinaturaSucessoPage() {
  return (
    <main className="night-sky flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fade-in-up rounded-card bg-white p-7 text-center shadow-2xl ring-1 ring-black/5">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-brand-secondary">
          FidelizaEu
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold text-brand-primary">
          Pagamento confirmado!
        </h1>
        <p className="mt-3 text-sm text-neutral-500">
          Enviamos um e-mail de convite para você definir sua senha e acessar
          o painel do seu estabelecimento. Se não chegar em alguns minutos,
          confira a caixa de spam.
        </p>
        <Link href="/login" className={`${ui.btnPrimary} mt-6 w-full`}>
          Já defini minha senha, entrar
        </Link>
      </div>
    </main>
  );
}
