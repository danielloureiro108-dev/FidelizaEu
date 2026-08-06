import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Inicia uma assinatura mensal para um NOVO estabelecimento (self-service).
// Não exige login: o Checkout do Stripe coleta e-mail e pagamento; o
// provisionamento do tenant acontece no webhook após o pagamento confirmar.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const businessName: string = (body.businessName || "").trim();
  const email: string = (body.email || "").trim();

  if (!businessName || !email) {
    return NextResponse.json(
      { error: "Informe o nome do estabelecimento e o e-mail." },
      { status: 400 }
    );
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    customer_email: email,
    subscription_data: {
      trial_period_days: 14,
      metadata: { business_name: businessName },
    },
    metadata: { business_name: businessName },
    allow_promotion_codes: true,
    success_url: `${origin}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/assinar?cancelado=1`,
  });

  return NextResponse.json({ url: session.url });
}
