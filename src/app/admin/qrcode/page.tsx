"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function QrCodePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [rotationSecs, setRotationSecs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/token", { cache: "no-store" });
      if (!res.ok) {
        setError("Sem permissão para gerar o QR (precisa ser admin).");
        return;
      }
      const { token, slug, remaining, rotationSecs } = await res.json();
      setRemaining(remaining);
      setRotationSecs(rotationSecs);
      setError(null);

      const url = `${window.location.origin}/scan?t=${slug}&c=${token}`;
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, url, { width: 320, margin: 1 });
      }
    } catch {
      setError("Falha ao carregar o token.");
    }
  }

  useEffect(() => {
    refresh();
    // Atualiza o QR a cada 5s e recalcula o countdown a cada 1s.
    const qr = setInterval(refresh, 5000);
    const tick = setInterval(
      () => setRemaining((r) => (r === null ? r : Math.max(0, r - 1))),
      1000
    );
    return () => {
      clearInterval(qr);
      clearInterval(tick);
    };
  }, []);

  const progress =
    remaining !== null && rotationSecs ? Math.max(0, Math.min(1, remaining / rotationSecs)) : 0;

  return (
    <div className="flex animate-fade-in-up flex-col items-center text-center">
      <h1 className="font-display text-2xl font-bold text-brand-primary">
        QR do dia
      </h1>
      <p className="mt-1 max-w-md text-sm text-neutral-500">
        Deixe esta tela no balcão. O código se renova sozinho — o cliente precisa
        escanear o que está na tela <em>agora</em>.
      </p>

      <div className="mt-6 rounded-card border border-neutral-200/80 bg-white p-6 shadow-glow">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <canvas ref={canvasRef} className="rounded-lg" />
        )}
      </div>

      {remaining !== null && !error && (
        <div className="mt-5 w-full max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full rounded-full bg-brand-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-neutral-500">
            Renova em <strong className="text-brand-primary">{remaining}s</strong>
          </p>
        </div>
      )}
    </div>
  );
}
