"use client";

import Image from "next/image";
import { useState } from "react";
import { shouldOptimizeRemoteImage } from "@/lib/image-optimization";

type Props = {
  imageUrl: string;
  fighterName: string;
  corner: "A" | "B";
};

/** Hides a blocked UFC image so the server-rendered silhouette remains visible. */
export default function FighterHeadshotMedia({ imageUrl, fighterName, corner }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (failedUrl === imageUrl) return null;

  return (
    <Image
      src={imageUrl}
      alt={fighterName}
      fill
      sizes="(max-width: 640px) 52vw, 520px"
      unoptimized={!shouldOptimizeRemoteImage(imageUrl)}
      className={`box-border object-contain object-bottom pt-3 drop-shadow-[0_16px_20px_rgba(0,0,0,0.45)] transition-transform duration-500 sm:pt-4 ${
        corner === "A"
          ? "translate-x-[9%] sm:translate-x-[12%]"
          : "-translate-x-[9%] sm:-translate-x-[12%]"
      }`}
      onError={() => setFailedUrl(imageUrl)}
    />
  );
}
