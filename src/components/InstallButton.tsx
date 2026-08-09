"use client";

import { useEffect, useState } from "react";
import { ui } from "@/lib/ui";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari/iOS não tem display-mode: standalone, usa esta flag própria.
    (navigator as any).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

// Botão único que se adapta à plataforma: Android/Chrome dispara o prompt
// nativo de instalação; iOS não oferece esse evento, então mostra o passo a
// passo do "Adicionar à Tela de Início" do Safari.
export function InstallButton({ appName = "o app" }: { appName?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(true); // some enquanto detectamos, evita flash

  useEffect(() => {
    setInstalled(isStandalone());

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferredPrompt(null);
      setInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!deferredPrompt && !isIos()) return null;

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
      return;
    }
    setShowIosHelp(true);
  }

  return (
    <>
      <div className="mt-5 border-t border-neutral-100 pt-5">
        <button type="button" onClick={handleClick} className={`${ui.btnSecondary} w-full`}>
          Instalar app
        </button>
      </div>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="w-full max-w-sm rounded-card bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-display text-lg font-bold text-brand-primary">
              Instalar {appName}
            </p>
            <ol className="mt-3 space-y-2 text-sm text-neutral-600">
              <li>1. Toque no ícone de compartilhar (□↑) na barra do Safari.</li>
              <li>2. Escolha &quot;Adicionar à Tela de Início&quot;.</li>
              <li>3. Toque em &quot;Adicionar&quot;.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className={`${ui.btnPrimary} mt-4 w-full`}
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
