"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type Props = {
  cardRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  shareCaption: string;
  whatsappTextUrl: string;
};

export default function ShareActions({ cardRef, filename, shareCaption, whatsappTextUrl }: Props) {
  const [capturing, setCapturing] = useState(false);

  async function captureBlob(): Promise<Blob | null> {
    if (!cardRef.current) return null;
    setCapturing(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      });
      const res = await fetch(dataUrl);
      return res.blob();
    } catch {
      toast.error("Não foi possível gerar a imagem.");
      return null;
    } finally {
      setCapturing(false);
    }
  }

  function downloadBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(shareCaption);
      toast.success("Legenda copiada.");
    } catch {
      /* clipboard not available */
    }
  }

  async function handleDownload() {
    const blob = await captureBlob();
    if (!blob) return;
    downloadBlob(blob);
  }

  async function handleShare() {
    const blob = await captureBlob();
    if (!blob) return;

    const file = new File([blob], filename, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: shareCaption });
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          downloadBlob(blob);
          await copyCaption();
        }
      }
    } else {
      downloadBlob(blob);
      await copyCaption();
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        onClick={handleDownload}
        disabled={capturing}
        className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest disabled:opacity-60"
        style={{
          border: "1px solid var(--border)",
          color: "var(--text)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        {capturing ? "Gerando..." : "Baixar imagem"}
      </button>
      <button
        onClick={handleShare}
        disabled={capturing}
        className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--red)" }}
      >
        {capturing ? "Gerando..." : "Compartilhar imagem"}
      </button>
      <a
        href={whatsappTextUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest"
        style={{
          border: "1px solid var(--border)",
          color: "var(--text)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        Compartilhar texto
      </a>
    </div>
  );
}
