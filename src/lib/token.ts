import crypto from "crypto";

/**
 * Token rotativo estilo TOTP.
 *
 * O QR exibido pelo estabelecimento muda a cada `rotationSecs`. Isso obriga o
 * cliente a estar presente para escanear o código atual — evita que alguém
 * carimbe de casa com uma foto de um QR estático.
 *
 * token = HMAC-SHA256(stamp_secret, floor(now / rotationSecs)) truncado.
 * Na validação aceitamos a janela atual e a anterior (tolerância de relógio).
 */

function computeToken(secret: string, step: number): string {
  return crypto
    .createHmac("sha256", secret)
    .update(String(step))
    .digest("hex")
    .slice(0, 12);
}

export function currentToken(secret: string, rotationSecs: number): string {
  const step = Math.floor(Date.now() / 1000 / Math.max(1, rotationSecs));
  return computeToken(secret, step);
}

export function verifyToken(
  token: string,
  secret: string,
  rotationSecs: number
): boolean {
  const step = Math.floor(Date.now() / 1000 / Math.max(1, rotationSecs));
  const candidates = [computeToken(secret, step), computeToken(secret, step - 1)];
  // Comparação em tempo constante para cada candidato.
  return candidates.some((c) => {
    const a = Buffer.from(c);
    const b = Buffer.from(token || "");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}
