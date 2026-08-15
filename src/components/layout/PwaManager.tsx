"use client";

import { useEffect, useState } from "react";
import {
  type DeferredInstallPrompt,
  usePwaInstall,
} from "@/lib/pwa-install";

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export default function PwaManager() {
  const [online, setOnline] = useState(true);
  const setInstallPrompt = usePwaInstall((state) => state.setInstallPrompt);
  const setInstalled = usePwaInstall((state) => state.setInstalled);

  useEffect(() => {
    setOnline(navigator.onLine);
    setInstalled(isStandalone());

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Falha ao registrar service worker", error);
      });
    }

    function handleOnline() {
      setOnline(true);
    }
    function handleOffline() {
      setOnline(false);
    }
    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as DeferredInstallPrompt);
    }
    function handleInstalled() {
      setInstallPrompt(null);
      setInstalled(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [setInstallPrompt, setInstalled]);

  if (online) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[100] flex min-h-10 items-center justify-center px-4 py-2 text-center font-condensed text-xs font-900 uppercase tracking-widest text-white"
      style={{ backgroundColor: "var(--red)" }}
      role="status"
      aria-live="polite"
    >
      Sem conexão — seus novos picks ficam neste aparelho até a internet voltar
    </div>
  );
}
