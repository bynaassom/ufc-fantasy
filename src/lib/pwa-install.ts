"use client";

import { create } from "zustand";

export type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaInstallState = {
  installPrompt: DeferredInstallPrompt | null;
  installed: boolean;
  setInstallPrompt: (prompt: DeferredInstallPrompt | null) => void;
  setInstalled: (installed: boolean) => void;
};

export const usePwaInstall = create<PwaInstallState>((set) => ({
  installPrompt: null,
  installed: false,
  setInstallPrompt: (installPrompt) => set({ installPrompt }),
  setInstalled: (installed) => set({ installed }),
}));
