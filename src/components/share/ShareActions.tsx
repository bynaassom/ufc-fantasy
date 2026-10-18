"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Props = {
  cardRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  shareCaption: string;
  whatsappTextUrl: string;
};

export default function ShareActions({ cardRef, filename, shareCaption, whatsappTextUrl }: Props) {
  const [capturing, setCapturing] = useState(false);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    void captureBlob().then((blob) => {
      if (active && blob) setPreparedFile(new File([blob], filename, { type: "image/png" }));
    });
    return () => { active = false; };
    // The card is immutable for this share page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename]);

  function waitForPaint() {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  async function captureBlob(): Promise<Blob | null> {
    const node = cardRef.current;
    if (!node) return null;
    setCapturing(true);
    try {
      await document.fonts?.ready?.catch(() => undefined);
      await waitForPaint();

      const { toBlob } = await import("html-to-image");
      const rect = node.getBoundingClientRect();
      const width = Math.ceil(Math.max(rect.width, node.scrollWidth));
      const height = Math.ceil(Math.max(rect.height, node.scrollHeight));
      const backgroundColor =
        getComputedStyle(node).backgroundColor ||
        getComputedStyle(document.documentElement).getPropertyValue("--bg") ||
        "#0d0d0d";

      const blob = await toBlob(node, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        width,
        height,
        backgroundColor,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: "none",
          transform: "none",
        },
      });
      if (!blob) throw new Error("html-to-image returned an empty image");
      if (!blob.type.includes("png")) {
        return new Blob([blob], { type: "image/png" });
      }
      return blob;
    } catch (error) {
      console.error("Share image generation failed", error);
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
      toast.error("Não foi possível copiar. Selecione a legenda abaixo e copie.");
    }
  }

  async function handleDownload() {
    const blob = preparedFile || await captureBlob();
    if (!blob) return;
    downloadBlob(blob);
  }

  async function handleShare() {
    const blob = preparedFile || await captureBlob();
    if (!blob) return;

    const file = preparedFile || new File([blob], filename, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text: shareCaption });
      } catch (error: unknown) {
        if (!(error instanceof Error && error.name === "AbortError")) {
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap" aria-busy={capturing}>
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
        {capturing ? "Gerando..." : "Compartilhar card + legenda"}
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
        Abrir legenda no WhatsApp
      </a>
      </div>
      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label htmlFor="share-caption" className="font-condensed font-900 uppercase tracking-wide text-[var(--text)]">Legenda pronta</label>
          <button onClick={copyCaption} className="min-h-11 px-3 text-sm font-semibold text-[var(--text)] underline underline-offset-4">Copiar legenda</button>
        </div>
        <textarea id="share-caption" readOnly value={shareCaption} rows={6} className="w-full resize-y border border-[var(--border)] bg-[var(--bg)] p-3 text-sm leading-relaxed text-[var(--text)]" />
        <p className="mt-3 text-sm text-[var(--text-secondary)]">No celular, escolha o WhatsApp ao compartilhar. Se essa opção não aparecer, baixe o card e envie com a legenda.</p>
      </div>
    </div>
  );
}
