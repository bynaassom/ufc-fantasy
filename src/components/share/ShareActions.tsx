"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { captureShareImage } from "@/lib/share-image";

type Props = {
  cardRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  shareCaption: string;
  whatsappTextUrl: string;
};

export default function ShareActions({
  cardRef,
  filename,
  shareCaption,
  whatsappTextUrl,
}: Props) {
  const [capturing, setCapturing] = useState(false);
  const [preparedFile, setPreparedFile] = useState<File | null>(null);

  const [imageError, setImageError] = useState(false);
  const captureFile = useCallback(async () => {
    const node = cardRef.current;
    if (!node) return null;
    return new File([await captureShareImage(node)], filename, {
      type: "image/png",
    });
  }, [cardRef, filename]);

  useEffect(() => {
    let active = true;
    setCapturing(true);
    setPreparedFile(null);
    setImageError(false);
    void captureFile()
      .then((file) => {
        if (active) setPreparedFile(file);
      })
      .catch((error: unknown) => {
        console.error("Share image generation failed", error);
        if (active) setImageError(true);
      })
      .finally(() => {
        if (active) setCapturing(false);
      });
    return () => {
      active = false;
    };
  }, [captureFile]);

  async function prepareFile() {
    setCapturing(true);
    setImageError(false);
    try {
      const file = await captureFile();
      if (!file) throw new Error("Card indisponível");
      setPreparedFile(file);
      return file;
    } catch (error) {
      console.error("Share image generation failed", error);
      setImageError(true);
      toast.error("Não foi possível gerar a imagem. Tente novamente.");
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
      toast.error(
        "Não foi possível copiar. Selecione a legenda abaixo e copie.",
      );
    }
  }

  async function handleDownload() {
    const file = preparedFile || (await prepareFile());
    if (file) downloadBlob(file);
  }

  async function handleShare() {
    if (!preparedFile) {
      // Preparing asynchronously consumes mobile browsers' user activation.
      if (await prepareFile())
        toast.success("Imagem pronta. Toque em compartilhar novamente.");
      return;
    }
    try {
      if (navigator.share && navigator.canShare?.({ files: [preparedFile] })) {
        await navigator.share({ files: [preparedFile], text: shareCaption });
        return;
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
    downloadBlob(preparedFile);
    await copyCaption();
  }

  return (
    <div className="space-y-4">
      {imageError && (
        <p role="status" className="text-sm text-[var(--text)]">
          A imagem não ficou pronta. Toque em baixar ou compartilhar para tentar
          novamente. A legenda continua disponível abaixo.
        </p>
      )}
      <div
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
        aria-busy={capturing}
      >
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
          <label
            htmlFor="share-caption"
            className="font-condensed font-900 uppercase tracking-wide text-[var(--text)]"
          >
            Legenda pronta
          </label>
          <button
            onClick={copyCaption}
            className="min-h-11 px-3 text-sm font-semibold text-[var(--text)] underline underline-offset-4"
          >
            Copiar legenda
          </button>
        </div>
        <textarea
          id="share-caption"
          readOnly
          value={shareCaption}
          rows={6}
          className="w-full resize-y border border-[var(--border)] bg-[var(--bg)] p-3 text-sm leading-relaxed text-[var(--text)]"
        />
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          No celular, escolha o WhatsApp ao compartilhar. Se essa opção não
          aparecer, baixe o card e envie com a legenda.
        </p>
      </div>
    </div>
  );
}
