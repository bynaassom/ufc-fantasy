"use client";

import { useState, type CSSProperties, type Ref, type ReactNode } from "react";
import { getImageProps } from "next/image";
import { shouldOptimizeRemoteImage } from "@/lib/image-optimization";
import { formatEventDate } from "@/lib/utils";
import type { Event } from "@/types";

export const shareMuted = "#aaa9a5";
export const shareLabel: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.09em",
};
export function formatShareMethod(
  method?: string | null,
  round?: number | null,
) {
  if (!method) return "";
  const methods: Record<string, string> = {
    knockout: "KO/TKO",
    submission: "SUB",
    decision: "DEC",
    disqualification: "DQ",
  };
  return `${methods[method] || method}${method !== "decision" && round ? ` · R${round}` : ""}`;
}

export default function EventShareCardFrame({
  event,
  cardRef,
  siteHost,
  badge,
  children,
}: {
  event: Event;
  cardRef?: Ref<HTMLDivElement>;
  siteHost: string;
  badge: string;
  children: ReactNode;
}) {
  const [failedBannerSources, setFailedBannerSources] = useState<string[]>([]);
  const bannerUrl = event.banner_image_url;
  const optimizedBanner =
    bannerUrl && shouldOptimizeRemoteImage(bannerUrl)
      ? getImageProps({
          src: bannerUrl,
          alt: "",
          width: 540,
          height: 304,
          quality: 80,
        }).props.src
      : bannerUrl;
  const bannerSrc = [optimizedBanner, bannerUrl].find(
    (src): src is string => !!src && !failedBannerSources.includes(src),
  );
  const muted = shareMuted;
  const label = shareLabel;
  return (
    <div
      ref={cardRef}
      data-result-card
      className="font-condensed"
      style={{
        width: 540,
        backgroundColor: "#101010",
        color: "#f5f3ee",
        padding: 28,
        boxSizing: "border-box",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        {/* The card stays dark in both app themes; use the matching SVG. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-dark.svg"
          alt="UFC Fantasy"
          width={170}
          height={30}
          style={{ display: "block", width: 170, height: 30 }}
        />
        <span style={{ ...label, color: muted }}>{badge}</span>
      </div>

      {bannerSrc && (
        <div
          style={{ margin: "0 -28px", height: 304, backgroundColor: "#242424" }}
        >
          {/* The same-origin optimizer allows the exporter to embed official UFC art. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerSrc}
            data-share-raster
            alt={`Banner de ${event.name}`}
            loading="eager"
            onError={() =>
              setFailedBannerSources((sources) => [...sources, bannerSrc])
            }
            style={{
              display: "block",
              width: 540,
              height: 304,
              objectFit: "cover",
              objectPosition: event.banner_object_position || "center",
            }}
          />
        </div>
      )}
      <div style={{ padding: "22px 0", borderBottom: "1px solid #383838" }}>
        <div style={{ position: "relative" }}>
          <h2
            style={{
              fontSize: 36,
              lineHeight: 1.04,
              fontWeight: 900,
              textTransform: "uppercase",
              overflowWrap: "anywhere",
              maxWidth: 410,
            }}
          >
            {event.name}
          </h2>
          <p style={{ ...label, color: "#d0ceca", marginTop: 14 }}>
            {formatEventDate(event.event_date)}
          </p>
        </div>
      </div>

      {children}
      <div
        style={{
          marginTop: 24,
          paddingTop: 18,
          borderTop: "2px solid #e8001a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span
          style={{ fontSize: 18, fontWeight: 800, textTransform: "uppercase" }}
        >
          Palpite agora
        </span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#f5f3ee",
            textAlign: "right",
            overflowWrap: "anywhere",
            maxWidth: 280,
          }}
        >
          {siteHost}
        </span>
      </div>
    </div>
  );
}
