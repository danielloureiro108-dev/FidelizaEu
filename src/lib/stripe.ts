import Stripe from "stripe";

// Instância única do SDK do Stripe (uso exclusivo no servidor).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
