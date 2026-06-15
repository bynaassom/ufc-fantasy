"use client";

import { useState } from "react";
import toast from "react-hot-toast";

type Props = {
  cardRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  shareCaption: string;
  whatsappTextUrl: string;
  bannerLoaded?: boolean;
  serverImageUrl?: string;
};

export default function ShareActions({ cardRef, filename, shareCaption, whatsappTextUrl, bannerLoaded = true, serverImageUrl }: Props) {
  const [capturing, setCapturing] = useState(false);
  const canCapture = (!!serverImageUrl || bannerLoaded) && !capturing;

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

    const CARD_W = 540;
    const CARD_H = 960;

    try {
      if (serverImageUrl) {
        try {
          const response = await fetch(serverImageUrl, { cache: "no-store" });
          if (response.ok) return response.blob();
        } catch (err) {
          console.warn("Server share image failed, trying DOM capture", err);
        }
      }

      await document.fonts?.ready?.catch(() => undefined);
      await waitForImages(node);
      await waitForPaint();

      const bgColor = getComputedStyle(node).backgroundColor || "#0d0d0d";

      // Primary: html-to-image (more reliable layout rendering)
      try {
        const { toBlob, toPng } = await import("html-to-image");

        try {
          const blob = await toBlob(node, {
            pixelRatio: 2,
            cacheBust: true,
            width: CARD_W,
            height: CARD_H,
            backgroundColor: bgColor,
            style: { width: `${CARD_W}px`, height: `${CARD_H}px`, maxWidth: "none", transform: "none" },
          });
          if (blob) return blob;
        } catch {}

        const dataUrl = await toPng(node, {
          pixelRatio: 2,
          cacheBust: true,
          width: CARD_W,
          height: CARD_H,
          backgroundColor: bgColor,
          style: { width: `${CARD_W}px`, height: `${CARD_H}px`, maxWidth: "none", transform: "none" },
        });
        const res = await fetch(dataUrl);
        return res.blob();
      } catch (err) {
        console.warn("html-to-image failed, trying html2canvas", err);
      }

      // Fallback: html2canvas
      try {
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: bgColor,
          logging: false,
          width: CARD_W,
          height: CARD_H,
        });
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        if (blob) return blob;
      } catch (err) {
        console.warn("html2canvas fallback also failed", err);
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

  function jpegFilename(value: string) {
    return value.replace(/\.png$/i, ".jpg");
  }

  async function flattenForShare(blob: Blob): Promise<Blob | null> {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      const loaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Could not load share image for JPEG conversion"));
      });
      img.src = url;
      await loaded;
      await img.decode?.().catch(() => undefined);

      const width = img.naturalWidth || 1080;
      const height = img.naturalHeight || 1920;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.fillStyle = "#0d0d0d";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.94),
      );
    } catch (err) {
      console.warn("JPEG share conversion failed", err);
      return null;
    } finally {
      URL.revokeObjectURL(url);
    }
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

    const shareBlob = await flattenForShare(blob);
    const file = shareBlob
      ? new File([shareBlob], jpegFilename(filename), { type: "image/jpeg" })
      : new File([blob], filename, { type: "image/png" });

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
        {!serverImageUrl && !bannerLoaded ? "Carregando..." : capturing ? "Gerando..." : "Baixar imagem"}
      </button>
      <button
        onClick={handleShare}
        disabled={!canCapture}
        className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--red)" }}
      >
        {!serverImageUrl && !bannerLoaded ? "Carregando..." : capturing ? "Gerando..." : "Compartilhar imagem"}
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
