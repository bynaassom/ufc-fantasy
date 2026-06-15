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

  function waitForPaint() {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  // Inline external images via our CORS proxy so they don't taint the canvas
  // Returns a restore function to revert img srcs back to originals
  async function inlineImages(node: HTMLElement): Promise<() => void> {
    const imgs = Array.from(node.querySelectorAll<HTMLImageElement>("img[src]"));
    const restored: { img: HTMLImageElement; src: string; blobUrl: string }[] = [];
    for (const img of imgs) {
      const originalSrc = img.src;
      if (originalSrc.startsWith("data:") || originalSrc.startsWith("blob:")) continue;
      try {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(originalSrc)}`;
        const resp = await fetch(proxyUrl);
        if (!resp.ok) {
          console.warn("proxy fetch not ok", resp.status, originalSrc);
          continue;
        }
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        img.src = blobUrl;
        restored.push({ img, src: originalSrc, blobUrl });
        await img.decode();
      } catch (e) {
        console.error("inlineImages failed for", originalSrc, e);
      }
    }
    return () => {
      for (const { img, src, blobUrl } of restored) {
        img.src = src;
        URL.revokeObjectURL(blobUrl);
      }
    };
  }

  async function captureBlob(): Promise<Blob | null> {
    const node = cardRef.current;
    if (!node) return null;
    setCapturing(true);
    let restore: (() => void) | null = null;

    try {
      await document.fonts?.ready?.catch(() => undefined);
      await waitForPaint();
      restore = await inlineImages(node);

      const { toBlob, toPng } = await import("html-to-image");
      const width = node.scrollWidth;
      const height = node.scrollHeight;
      const bgColor = getComputedStyle(node).backgroundColor || "#0d0d0d";

      try {
        const blob = await toBlob(node, {
          pixelRatio: 2,
          cacheBust: true,
          width,
          height,
          backgroundColor: bgColor,
          style: {
            width: `${width}px`,
            height: `${height}px`,
            maxWidth: "none",
            transform: "none",
          },
        });
        if (blob) return blob;
      } catch (err) {
        console.warn("toBlob failed, fallback to toPng", err);
      }

      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        width,
        height,
        backgroundColor: bgColor,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: "none",
          transform: "none",
        },
      });
      const res = await fetch(dataUrl);
      return res.blob();
    } catch (error) {
      console.error("Share image generation failed", error);
      toast.error("Não foi possível gerar a imagem.");
      return null;
    } finally {
      restore?.();
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
