"use client";

import { useEffect, useRef, useState } from "react";

// Leitor de QR baseado em câmera. Chama onDecode com o texto lido (1x).
export function QrScanner({
  onDecode,
  paused,
}: {
  onDecode: (text: string) => void;
  paused?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const decodedRef = useRef(false);

  useEffect(() => {
    let scanner: any;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || !containerRef.current) return;

        scanner = new Html5Qrcode(containerRef.current.id);
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText: string) => {
            if (decodedRef.current || paused) return;
            decodedRef.current = true;
            onDecode(decodedText);
          },
          () => {} // erros de frame são normais; ignoramos
        );
      } catch (e: any) {
        setError(
          "Não foi possível acessar a câmera. Verifique as permissões do navegador."
        );
      }
    })();

    return () => {
      cancelled = true;
      if (scanner) {
        scanner.stop().catch(() => {}).finally(() => scanner.clear?.());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <div
        id="qr-reader"
        ref={containerRef}
        className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-card bg-black shadow-2xl ring-4 ring-white/10"
      />
      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
