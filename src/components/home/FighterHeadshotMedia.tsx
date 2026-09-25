"use client";

import Image from "next/image";
import { useState } from "react";
import { shouldOptimizeRemoteImage } from "@/lib/image-optimization";
import { getUfcOriginalHeadshotUrl } from "@/lib/ufc-image-url";

type Props = {
  imageUrl: string | null;
  fighterName: string;
  corner: "A" | "B";
};

/** Shows the local portrait placeholder when the UFC image is unavailable. */
export default function FighterHeadshotMedia({ imageUrl, fighterName, corner }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [failedOriginalUrl, setFailedOriginalUrl] = useState<string | null>(null);
  const preferredImageUrl = getUfcOriginalHeadshotUrl(imageUrl);
  const useStoredUrl = Boolean(
    imageUrl && preferredImageUrl !== imageUrl && failedOriginalUrl === preferredImageUrl,
  );
  const useFallback = !imageUrl || failedUrl === imageUrl;
  const src = useFallback
    ? "/fighter-placeholder.svg"
    : useStoredUrl
      ? imageUrl
      : preferredImageUrl || imageUrl;

  return (
    <Image
      src={src}
      alt={useFallback ? `Foto indisponível: ${fighterName}` : fighterName}
      fill
      sizes="(max-width: 640px) 52vw, 520px"
      unoptimized={!useFallback && !shouldOptimizeRemoteImage(imageUrl || "")}
      className={`box-border ${useFallback ? "object-contain" : "object-cover object-top"} drop-shadow-[0_16px_20px_rgba(0,0,0,0.45)] transition-transform duration-500 ${
        corner === "A"
          ? "translate-x-[9%] sm:translate-x-[12%]"
          : "-translate-x-[9%] sm:-translate-x-[12%]"
      }`}
      onError={() => {
        if (!imageUrl) return;
        if (src !== imageUrl && preferredImageUrl !== imageUrl) {
          setFailedOriginalUrl(preferredImageUrl);
        } else {
          setFailedUrl(imageUrl);
        }
      }}
    />
  );
}
