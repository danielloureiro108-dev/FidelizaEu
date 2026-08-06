"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function QrCodePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const res = await fetch("/api/token", { cache: "no-store" });
      if (!res.ok) {
        setError("Sem permissão para gerar o QR (precisa ser admin).");
        return;
      }
      const { token, slug, remaining } = await res.json();
      setRemaining(remaining);
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

  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-display text-2xl font-bold text-brand-primary">
        QR do dia
      </h1>
      <p className="mt-1 max-w-md text-sm text-neutral-500">
        Deixe esta tela no balcão. O código se renova sozinho — o cliente precisa
        escanear o que está na tela <em>agora</em>.
      </p>

      <div className="mt-6 rounded-card border border-neutral-200 p-6 shadow-sm">
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>

      {remaining !== null && !error && (
        <p className="mt-4 text-sm text-neutral-500">
          Renova em <strong>{remaining}s</strong>
        </p>
      )}
    </div>
  );
}
