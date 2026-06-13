"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function CopyInviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const link = `${window.location.origin}/convite/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link de convite copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar.");
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="px-4 py-2 font-condensed text-xs font-900 uppercase tracking-widest transition-opacity hover:opacity-80"
      style={{
        color: copied ? "#22c55e" : "var(--text)",
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-card)",
      }}
    >
      {copied ? "Copiado!" : "Copiar link de convite"}
    </button>
  );
}
