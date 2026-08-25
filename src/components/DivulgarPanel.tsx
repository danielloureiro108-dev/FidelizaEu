"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { ui } from "@/lib/ui";

// Desenha a logo por cima do QR (nível de correção "H" tolera até ~30% de
// área coberta; usamos bem menos que isso pra manter a leitura confiável).
async function drawLogo(canvas: HTMLCanvasElement, logoUrl: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  img.crossOrigin = "anonymous";
  const loaded = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = logoUrl;
  });
  if (!loaded || !img.naturalWidth) return;

  const size = canvas.width * 0.2;
  const pad = size * 0.16;
  const x = (canvas.width - size) / 2;
  const y = (canvas.height - size) / 2;

  ctx.fillStyle = "#fff";
  ctx.fillRect(x - pad, y - pad, size + pad * 2, size + pad * 2);
  ctx.drawImage(img, x, y, size, size);
}

export function DivulgarPanel({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const origin = window.location.origin;
    setUrl(origin);

    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCode.toCanvas(canvas, origin, { width: 320, margin: 1, errorCorrectionLevel: "H" })
      .then(() => (logoUrl ? drawLogo(canvas, logoUrl) : undefined))
      .then(() => setError(null))
      .catch(() => setError("Não foi possível gerar o QR."));
  }, [logoUrl]);

  return (
    <div className="flex animate-fade-in-up flex-col items-center text-center">
      <h1 className="font-display text-2xl font-bold text-brand-primary print:hidden">
        Divulgar meu Cartão
      </h1>
      <p className="mt-1 max-w-md text-sm text-neutral-500 print:hidden">
        Imprima e deixe no balcão, na vitrine ou no cardápio — o cliente aponta a
        câmera, entra e já começa a carimbar.
      </p>

      <div className={`${ui.card} mt-6 p-8 print:border-0 print:shadow-none`}>
        <p className="font-display text-2xl font-bold text-brand-primary">
          Cartão Fidelidade Digital
        </p>
        <p className="mt-1 text-sm text-neutral-500">{name}</p>

        <div className="mt-4 flex justify-center">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            <canvas ref={canvasRef} className="rounded-lg" />
          )}
        </div>

        <p className="mt-3 text-xs text-neutral-400 print:hidden">{url}</p>
      </div>

      <button onClick={() => window.print()} className={`${ui.btnPrimary} mt-6 print:hidden`}>
        Imprimir
      </button>
    </div>
  );
}
