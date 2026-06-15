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

  async function fetchServerImageBlob() {
    if (!serverImageUrl) return null;

    try {
      const response = await fetch(serverImageUrl, { cache: "no-store" });
      if (response.ok) return response.blob();
    } catch (err) {
      console.warn("Server share image failed", err);
    }

    return null;
  }

  async function captureBlob(): Promise<Blob | null> {
    const node = cardRef.current;
    if (!node) return null;
    setCapturing(true);

    const CARD_W = 540;
    const CARD_H = 960;

    try {
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

      const serverBlob = await fetchServerImageBlob();
      if (serverBlob) return serverBlob;

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

  async function convertPngToJpeg(blob: Blob) {
    try {
      const response = await fetch("/api/share/convert-to-jpeg", {
        method: "POST",
        headers: { "Content-Type": "image/png" },
        body: blob,
      });
      if (!response.ok) {
        console.warn("Share image JPEG conversion returned non-OK status", response.status, response.statusText);
        return null;
      }
      const convertedBlob = await response.blob();
      if (!convertedBlob.size) {
        console.warn("Share image JPEG conversion returned empty blob", response.status, response.type);
        return null;
      }
      return convertedBlob;
    } catch (err) {
      console.warn("Share image JPEG conversion failed", err);
      return null;
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

    const shareBlob = blob.type === "image/png" ? await convertPngToJpeg(blob) : blob;
    if (!shareBlob) {
      toast.error("Não foi possível preparar a imagem para compartilhar.");
      return;
    }

    const isJpeg = shareBlob.type === "image/jpeg";
    const file = new File([shareBlob], isJpeg ? jpegFilename(filename) : filename, {
      type: shareBlob.type || (isJpeg ? "image/jpeg" : "image/png"),
    });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        await copyCaption();
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
