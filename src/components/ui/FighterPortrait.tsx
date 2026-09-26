"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { shouldOptimizeRemoteImage } from "@/lib/image-optimization";

type Props = {
  fighterName: string;
  fighterSlug?: string | null;
  imageUrl?: string | null;
  sizes: string;
  loading?: "eager" | "lazy";
};

type PortraitMedia = { imageUrl: string | null; fallbackUrl: string | null };
const PLACEHOLDER = "/fighter-placeholder.svg";

function usablePhoto(url?: string | null): url is string {
  return Boolean(url && !/silhouette|placeholder|ui-avatars|no[-_]image|default[-_]athlete/i.test(url));
}

function PortraitContent({ fighterName, fighterSlug, imageUrl, sizes, loading = "lazy" }: Props) {
  const [media, setMedia] = useState<PortraitMedia | null>();
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [tallUrls, setTallUrls] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25_000);
    const query = new URLSearchParams({ name: fighterName });
    if (fighterSlug) query.set("slug", fighterSlug);
    let active = true;

    async function loadPortrait(): Promise<PortraitMedia | null> {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const response = await fetch(`/api/fighter-portrait?${query}`, { signal: controller.signal });
        if (response.status === 503 && attempt < 2) {
          const retrySeconds = Number(response.headers.get("Retry-After")) || 1;
          await new Promise((resolve) => window.setTimeout(resolve, Math.min(5, Math.max(1, retrySeconds)) * 1000));
          if (!active || controller.signal.aborted) return null;
          continue;
        }
        if (!response.ok) throw new Error("Portrait unavailable");
        return response.json() as Promise<PortraitMedia>;
      }
      return null;
    }

    loadPortrait()
      .then((result) => { if (active) setMedia(result); })
      .catch(() => { if (active) setMedia(null); })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [fighterName, fighterSlug]);

  // Resolve the official standing portrait before falling back to a thumbnail.
  const src = media === undefined ? null :
    [media?.imageUrl, media?.fallbackUrl, imageUrl]
      .find((url) => usablePhoto(url) && !failedUrls.includes(url));
  const fullBody = Boolean(src && (
    src === media?.imageUrl || src === media?.fallbackUrl || tallUrls.includes(src)
  ));
  const loaded = Boolean(src && loadedUrl === src);

  return (
    <>
      {!loaded && (
        <Image src={PLACEHOLDER} alt={src ? "" : fighterName} fill sizes={sizes} loading={loading}
          className="object-contain object-top" unoptimized />
      )}
      {src && (
        // Standing portraits are ~3300px tall; display their upper 45%.
        <div className="absolute inset-x-0 top-0" style={{ height: fullBody ? "220%" : "100%" }}>
        <Image
          src={src}
          alt={fighterName}
          fill
          sizes={sizes}
          loading={loading}
          unoptimized={!shouldOptimizeRemoteImage(src)}
          className="object-contain object-top"
          style={{
            opacity: loaded ? 1 : 0,
          }}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (naturalHeight > naturalWidth * 2) {
              setTallUrls((current) => current.includes(src) ? current : [...current, src]);
            }
            setLoadedUrl(src);
          }}
          onError={() => setFailedUrls((current) => [...current, src])}
        />
        </div>
      )}
    </>
  );
}

/** Shared source selection, upper-body crop and fallback for matchup cards. */
export default function FighterPortrait(props: Props) {
  return <PortraitContent key={`${props.fighterName}:${props.fighterSlug}:${props.imageUrl}`} {...props} />;
}
