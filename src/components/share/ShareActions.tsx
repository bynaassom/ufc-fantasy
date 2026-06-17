"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

type Props = {
  cardRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  shareCaption: string;
  whatsappTextUrl: string;
  bannerLoaded?: boolean;
  serverImageUrl?: string;
  bannerImageUrl?: string;
};

export default function ShareActions({ cardRef, filename, shareCaption, whatsappTextUrl, bannerLoaded = true, serverImageUrl, bannerImageUrl }: Props) {
  const [capturing, setCapturing] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const canGenerate = (!!serverImageUrl || bannerLoaded) && !capturing;

  const bannerProxyUrl = bannerImageUrl
    ? `/api/image-proxy?url=${encodeURIComponent(bannerImageUrl)}`
    : null;

  useEffect(() => {
    if (!bannerProxyUrl) return;
    const img = new Image();
    img.src = bannerProxyUrl;
  }, [bannerProxyUrl]);

  function waitForPaint() {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 300);
        });
      });
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

  function getHeroRect(node: HTMLElement) {
    const hero = node.querySelector("[data-hero]") as HTMLElement | null;
    if (!hero) return null;

    const nodeRect = node.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const scaleX = 540 / nodeRect.width;
    const scaleY = 960 / nodeRect.height;
    return {
      x: (heroRect.left - nodeRect.left) * scaleX,
      y: (heroRect.top - nodeRect.top) * scaleY,
      width: heroRect.width * scaleX,
      height: heroRect.height * scaleY,
    };
  }

  function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load banner image"));
      img.src = src;
    });
  }

  function blobToImage(blob: Blob) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load overlay image"));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png") {
    return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type));
  }

  function positionToPercent(token: string, axis: "x" | "y", fallback: number) {
    const value = token.trim().toLowerCase();
    if (!value || value === "center") return fallback;
    if (axis === "x") {
      if (value === "left") return 0;
      if (value === "right") return 1;
    } else {
      if (value === "top") return 0;
      if (value === "bottom") return 1;
    }
    if (value.endsWith("%")) {
      const parsed = Number(value.slice(0, -1));
      return Number.isFinite(parsed) ? parsed / 100 : fallback;
    }
    return fallback;
  }

  function parseObjectPosition(value?: string) {
    const tokens = (value || "center").trim().split(/\s+/).filter(Boolean);
    let x = 0.5;
    let y = 0.5;

    if (tokens.length === 1) {
      const token = tokens[0].toLowerCase();
      if (token === "top" || token === "bottom") y = positionToPercent(token, "y", y);
      else x = positionToPercent(token, "x", x);
      return { x, y };
    }

    const [first, second] = tokens;
    if (first === "top" || first === "bottom") {
      y = positionToPercent(first, "y", y);
      x = positionToPercent(second, "x", x);
    } else {
      x = positionToPercent(first, "x", x);
      y = positionToPercent(second, "y", y);
    }
    return { x, y };
  }

  function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, rect: { x: number; y: number; width: number; height: number }, objectPosition?: string) {
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) return;

    const pos = parseObjectPosition(objectPosition);
    const srcRatio = srcW / srcH;
    const destRatio = rect.width / rect.height;
    let sx = 0;
    let sy = 0;
    let sw = srcW;
    let sh = srcH;

    if (srcRatio > destRatio) {
      sw = srcH * destRatio;
      sx = (srcW - sw) * pos.x;
    } else {
      sh = srcW / destRatio;
      sy = (srcH - sh) * pos.y;
    }

    ctx.drawImage(img, sx, sy, sw, sh, rect.x, rect.y, rect.width, rect.height);
  }

  async function captureOverlayBlob(node: HTMLElement, width: number, height: number) {
    const hero = node.querySelector("[data-hero]") as HTMLElement | null;
    const banner = node.querySelector("[data-banner]") as HTMLElement | null;
    const originalNodeBackground = node.style.background;
    const originalHeroBackground = hero?.style.background;
    const originalBannerDisplay = banner?.style.display;

    node.style.background = "transparent";
    if (hero) hero.style.background = "transparent";
    if (banner) banner.style.display = "none";

    try {
      const { toBlob, toPng } = await import("html-to-image");
      const options = {
        pixelRatio: 2,
        cacheBust: true,
        width,
        height,
        backgroundColor: "transparent",
        style: { width: `${width}px`, height: `${height}px`, maxWidth: "none", transform: "none" },
      };
      const blob = await toBlob(node, options);
      if (blob) return blob;

      const dataUrl = await toPng(node, options);
      const res = await fetch(dataUrl);
      return res.blob();
    } finally {
      node.style.background = originalNodeBackground;
      if (hero) hero.style.background = originalHeroBackground || "";
      if (banner) banner.style.display = originalBannerDisplay || "";
    }
  }

  async function composeCardBlob(node: HTMLElement, width: number, height: number) {
    if (!bannerProxyUrl) return null;
    const heroRect = getHeroRect(node);
    if (!heroRect) return null;

    const banner = node.querySelector("[data-banner]") as HTMLElement | null;
    const objectPosition = banner?.style.backgroundPosition || "center";
    const [bannerImg, overlayBlob] = await Promise.all([
      loadImage(bannerProxyUrl),
      captureOverlayBlob(node, width, height),
    ]);
    const overlayImg = await blobToImage(overlayBlob);

    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawCoverImage(ctx, bannerImg, {
      x: heroRect.x * 2,
      y: heroRect.y * 2,
      width: heroRect.width * 2,
      height: heroRect.height * 2,
    }, objectPosition);
    ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    return canvasToBlob(canvas);
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

      try {
        const composedBlob = await composeCardBlob(node, CARD_W, CARD_H);
        if (composedBlob) return composedBlob;
      } catch (err) {
        console.warn("Canvas share composition failed, trying DOM capture", err);
      }

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

  async function handleGenerate() {
    const blob = await captureBlob();
    if (blob) setImageBlob(blob);
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
    if (!imageBlob) return;
    downloadBlob(imageBlob);
  }

  async function handleShare() {
    if (!imageBlob) return;

    const shareBlob = imageBlob.type === "image/png" ? await convertPngToJpeg(imageBlob) : imageBlob;
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
        await navigator.share({ files: [file], text: shareCaption });
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          downloadBlob(imageBlob);
          await copyCaption();
        }
      }
    } else {
      downloadBlob(imageBlob);
      await copyCaption();
    }
  }

  const btnBase = "px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest";
  const btnDisabled = "disabled:opacity-60";

  if (!imageBlob) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`${btnBase} ${btnDisabled}`}
          style={
            capturing
              ? { border: "1px solid var(--border)", color: "var(--text)", backgroundColor: "var(--bg-card)" }
              : { backgroundColor: "var(--red)", color: "#fff" }
          }
        >
          {!canGenerate ? "Carregando..." : capturing ? "Gerando..." : "Gerar imagem"}
        </button>
        <a
          href={whatsappTextUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={btnBase}
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

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <button
        onClick={handleDownload}
        className={`${btnBase} ${btnDisabled}`}
        style={{
          border: "1px solid var(--border)",
          color: "var(--text)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        Baixar imagem
      </button>
      <button
        onClick={handleShare}
        className={`${btnBase} ${btnDisabled}`}
        style={{ backgroundColor: "var(--red)", color: "#fff" }}
      >
        Compartilhar imagem
      </button>
      <a
        href={whatsappTextUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={btnBase}
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
