"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type Props = {
  cardRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  shareCaption: string;
  whatsappTextUrl: string;
  bannerLoaded?: boolean;
};

export default function ShareActions({ cardRef, filename, shareCaption, whatsappTextUrl, bannerLoaded = true }: Props) {
  const [capturing, setCapturing] = useState(false);
  const canCapture = bannerLoaded && !capturing;

  function waitForPaint() {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  async function waitForImages(node: HTMLElement) {
    const imgs = Array.from(node.querySelectorAll<HTMLImageElement>("img"));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
            } else {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }
          }),
      ),
    );
    await Promise.all(imgs.map((img) => img.decode().catch(() => {})));
  }

  async function captureBlob(): Promise<Blob | null> {
    const node = cardRef.current;
    if (!node) return null;
    setCapturing(true);

    try {
      await document.fonts?.ready?.catch(() => undefined);
      await waitForImages(node);
      await waitForPaint();

      // Primary: html2canvas (no foreignObject — works on iOS PWA)
      try {
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#0d0d0d",
          logging: false,
          width: node.scrollWidth,
          height: node.scrollHeight,
        });
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (blob) return blob;
      } catch (err) {
        console.warn("html2canvas failed, trying html-to-image", err);
      }

      // Fallback: html-to-image
      try {
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
            style: { width: `${width}px`, height: `${height}px`, maxWidth: "none", transform: "none" },
          });
          if (blob) return blob;
        } catch {}

        const dataUrl = await toPng(node, {
          pixelRatio: 2,
          cacheBust: true,
          width,
          height,
          backgroundColor: bgColor,
          style: { width: `${width}px`, height: `${height}px`, maxWidth: "none", transform: "none" },
        });
        const res = await fetch(dataUrl);
        return res.blob();
      } catch (err) {
        console.warn("html-to-image fallback also failed", err);
      }

      toast.error("Não foi possível gerar a imagem.");
      return null;
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
        disabled={!canCapture}
        className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest disabled:opacity-60"
        style={{
          border: "1px solid var(--border)",
          color: "var(--text)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        {!bannerLoaded ? "Carregando..." : capturing ? "Gerando..." : "Baixar imagem"}
      </button>
      <button
        onClick={handleShare}
        disabled={!canCapture}
        className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--red)" }}
      >
        {!bannerLoaded ? "Carregando..." : capturing ? "Gerando..." : "Compartilhar imagem"}
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