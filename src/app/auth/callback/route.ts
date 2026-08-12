import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Troca o "code" do OAuth (Google) por uma sessão e redireciona.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Não confiar em new URL(request.url).origin aqui: atrás do Caddy, o
  // servidor standalone do Next.js pode resolvê-la para o endereço interno
  // de bind (HOSTNAME do container, ex. "0.0.0.0:3000") em vez do domínio
  // público — navegadores bloqueiam por segurança um redirect para
  // "0.0.0.0". O header Host (que o Caddy encaminha corretamente, como o
  // resto do app já assume em getActiveTenant()) é a fonte confiável.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : new URL(request.url).origin;

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
