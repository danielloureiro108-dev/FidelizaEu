import Link from "next/link";

const FEATURES = [
  {
    title: "QR anti-fraude",
    desc: "O código muda a cada minuto. Só quem está no balcão consegue carimbar — nada de print ou compartilhamento.",
  },
  {
    title: "Sua marca, não a nossa",
    desc: "Cores, logo e fonte do seu jeito. O cliente nem percebe que existe uma plataforma por trás.",
  },
  {
    title: "Regra no seu ritmo",
    desc: "Você decide quantos carimbos valem a recompensa, o limite por dia e o que o cliente ganha.",
  },
  {
    title: "Domínio próprio (opcional)",
    desc: "Use fidelidade.seurestaurante.com.br ou um subdomínio pronto — HTTPS automático nos dois casos.",
  },
  {
    title: "Sem app para baixar",
    desc: "Funciona no navegador do celular do cliente. Cadastro em segundos, com e-mail ou Google.",
  },
  {
    title: "Painel simples",
    desc: "Acompanhe carimbos, recompensas resgatadas e configure tudo em poucos cliques.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Assine em 2 minutos",
    desc: "Informe o nome do seu estabelecimento e e-mail para começar.",
  },
  {
    n: "2",
    title: "Personalize sua marca",
    desc: "Enviamos um convite por e-mail. Defina a senha, ajuste cores e logo, e configure a recompensa.",
  },
  {
    n: "3",
    title: "Coloque o QR no balcão",
    desc: "Deixe a tela do QR do dia visível e pronto — seus clientes já podem começar a carimbar.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-neutral-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white shadow-sm">
              F
            </span>
            <span className="font-display text-lg font-bold text-brand-primary">
              FidelizaEu
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 sm:flex">
            <a href="#recursos" className="transition hover:text-brand-primary">
              Recursos
            </a>
            <a href="#como-funciona" className="transition hover:text-brand-primary">
              Como funciona
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-full px-3.5 py-2 text-sm font-medium text-neutral-600 transition hover:text-brand-primary"
            >
              Entrar
            </Link>
            <Link
              href="/assinar"
              className="inline-flex items-center justify-center rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:opacity-90 active:scale-[0.98]"
            >
              Assinar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="night-sky relative overflow-hidden px-5 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-3xl animate-fade-in-up text-center">
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-brand-secondary">
            Cartão fidelidade digital, com a sua marca
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
            Transforme clientes ocasionais em clientes fiéis
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/80 sm:text-lg">
            Cartão de carimbos digital, QR anti-fraude e painel completo —
            pronto em minutos, com a cara do seu bar ou restaurante.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/assinar"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-secondary px-7 py-3 font-semibold text-brand-primary shadow-lift transition hover:opacity-90 active:scale-[0.98] sm:w-auto"
            >
              Começar agora
            </Link>
          </div>
          <p className="mt-4 text-xs text-white/60">
            Sem fidelidade. Cancele quando quiser, direto pelo painel.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="px-5 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-3xl font-bold text-brand-primary">
              Tudo que você precisa para fidelizar
            </h2>
            <p className="mt-3 text-neutral-500">
              Sem taxas por cliente cadastrado, sem hardware extra — só um QR
              Code no balcão.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-card border border-neutral-200/80 bg-white p-6 shadow-soft transition hover:shadow-lift"
              >
                <h3 className="font-display text-lg font-bold text-brand-primary">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="bg-neutral-50 px-5 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="font-display text-3xl font-bold text-brand-primary">
              Como funciona
            </h2>
          </div>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary font-display text-lg font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold text-brand-primary">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200/70 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-neutral-500 sm:flex-row">
          <span>© {new Date().getFullYear()} FidelizaEu</span>
          <Link href="/login" className="transition hover:text-brand-primary">
            Já sou cliente
          </Link>
        </div>
      </footer>
    </div>
  );
}
