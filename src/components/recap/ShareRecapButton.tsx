"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function ShareRecapButton({ eventName }: { eventName: string }) {
  const [sharing, setSharing] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      const shareData = {
        title: `Recap de ${eventName}`,
        text: `Veja como foi ${eventName} no UFC Fantasy.`,
        url: window.location.href,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link do recap copiado.");
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        toast.error("Não foi possível compartilhar o recap.");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={sharing}
      className="min-tap px-6 py-3 font-condensed text-sm font-900 uppercase tracking-widest disabled:opacity-60"
      style={{ color: "var(--text)", border: "1px solid var(--border)" }}
    >
      {sharing ? "Abrindo…" : "Compartilhar recap"}
    </button>
  );
}
