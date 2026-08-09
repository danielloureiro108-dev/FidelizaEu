"use client";

import { useEffect } from "react";

// Registra o service worker (obrigatório no Android para o app ser
// instalável). Silencioso em qualquer falha — não é crítico para a página.
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
