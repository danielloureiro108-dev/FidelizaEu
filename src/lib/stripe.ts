import Stripe from "stripe";

let instance: Stripe | null = null;

// Instanciado sob demanda (nunca no import): o Next.js avalia este módulo
// durante o build ("Collecting page data") sem que STRIPE_SECRET_KEY exista
// ainda — a chave só é injetada em runtime, não faz parte do build da imagem.
export function getStripe(): Stripe {
  if (!instance) {
    instance = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return instance;
}
