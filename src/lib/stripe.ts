import Stripe from "stripe";

// Instância do SDK do Stripe, criada sob demanda (não no import do módulo).
// STRIPE_SECRET_KEY é uma env var só de runtime (não é passada como build
// ARG no Dockerfile), então instanciar no topo do módulo quebra o
// `next build`, que importa as rotas para coletar dados das páginas.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}
