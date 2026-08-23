"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  imageUrl: string;
  fighterName: string;
};

/** Hides a blocked UFC image so the server-rendered silhouette remains visible. */
export default function FighterHeadshotMedia({ imageUrl, fighterName }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (failedUrl === imageUrl) return null;

  return (
    <Image
      src={imageUrl}
      alt={fighterName}
      fill
      sizes="(max-width: 640px) 38vw, 260px"
      className="object-contain object-bottom"
      onError={() => setFailedUrl(imageUrl)}
    />
  );
}
