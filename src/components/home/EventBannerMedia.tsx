"use client";

import Image from "next/image";
import { useState } from "react";
import { shouldOptimizeRemoteImage } from "@/lib/image-optimization";
import type { Event } from "@/types";
import EventPosterFallback from "./EventPosterFallback";

type Props = {
  event: Event;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  showOverlay?: boolean;
  showFallbackCopy?: boolean;
};

/** Keeps broken/blocked remote banners inside the same reserved poster box. */
export default function EventBannerMedia({
  event,
  alt,
  sizes,
  priority = false,
  className = "",
  showOverlay = false,
  showFallbackCopy = true,
}: Props) {
  const imageUrl = event.banner_image_url || null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasImage = Boolean(imageUrl) && failedUrl !== imageUrl;

  return (
    <>
      {hasImage ? (
        <Image
          src={imageUrl!}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          unoptimized={!shouldOptimizeRemoteImage(imageUrl!)}
          className={className}
          style={{ objectPosition: event.banner_object_position || "center" }}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <EventPosterFallback event={event} showCopy={showFallbackCopy} />
      )}
      {showOverlay && hasImage && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      )}
    </>
  );
}
