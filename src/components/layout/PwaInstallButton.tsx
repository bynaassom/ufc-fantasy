"use client";

import { useEffect, useState } from "react";
import { Dialog } from "radix-ui";
import toast from "react-hot-toast";
import { usePwaInstall } from "@/lib/pwa-install";

export default function PwaInstallButton() {
  const installPrompt = usePwaInstall((state) => state.installPrompt);
  const installed = usePwaInstall((state) => state.installed);
  const setInstallPrompt = usePwaInstall((state) => state.setInstallPrompt);
  const [isIos, setIsIos] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  useEffect(() => {
    const appleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = Boolean(
      (navigator as Navigator & { standalone?: boolean }).standalone,
    );
    setIsIos(appleMobile && !standalone);
  }, []);

  if (installed || (!installPrompt && !isIos)) return null;

  async function handleInstall() {
    if (!installPrompt) {
      setInstructionsOpen(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") toast.success("App instalado.");
  }

  return (
    <Dialog.Root open={instructionsOpen} onOpenChange={setInstructionsOpen}>
      <button
        type="button"
        onClick={handleInstall}
        className="flex w-full items-center justify-center gap-2 px-4 py-3 font-condensed text-xs font-900 uppercase tracking-widest"
        style={{ color: "var(--text)", borderTop: "1px solid var(--border)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
        Instalar UFC Fantasy
      </button>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[100]"
          style={{ backgroundColor: "var(--bg-overlay-82)" }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[110] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 outline-none"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderTop: "3px solid var(--red)" }}
        >
          <div className="p-5">
            <Dialog.Title className="font-condensed text-xl font-900 uppercase" style={{ color: "var(--text)" }}>
              Instalar no iPhone
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Siga estas etapas no Safari para adicionar o app à tela de início.
            </Dialog.Description>
            <ol className="mt-4 space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>1. Toque no botão <strong style={{ color: "var(--text)" }}>Compartilhar</strong> do Safari.</li>
              <li>2. Escolha <strong style={{ color: "var(--text)" }}>Adicionar à Tela de Início</strong>.</li>
              <li>3. Abra o UFC Fantasy pelo novo ícone.</li>
            </ol>
          </div>
          <Dialog.Close asChild>
            <button
              type="button"
              className="min-tap w-full px-4 py-3 font-condensed text-xs font-900 uppercase tracking-widest text-white"
              style={{ backgroundColor: "var(--red)" }}
            >
              Entendi
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
