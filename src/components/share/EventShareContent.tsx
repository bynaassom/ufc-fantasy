"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ShareActions from "./ShareActions";

export function sharePageDetails(
  kind: "result" | "picks",
  slug: string,
  nickname: string,
  shareUrl: string,
) {
  const safeNickname =
    nickname
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "jogador";
  let siteHost = "UFC Fantasy";
  try {
    siteHost = new URL(shareUrl).host;
  } catch {
    /* Relative URL without an origin. */
  }
  return {
    filename: `ufc-fantasy-${kind}-${slug}-${safeNickname}.png`,
    siteHost,
  };
}

export default function EventShareContent({
  title,
  shareCaption,
  filename,
  shareUrl,
  canShare,
  children,
}: {
  title: string;
  shareCaption: string;
  filename: string;
  shareUrl: string;
  canShare: boolean;
  children: ReactNode;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 0.6, height: 700 });

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const card = cardRef.current;
    if (!wrapper || !card) return;
    const update = () =>
      setSize({
        scale: Math.min(1, wrapper.clientWidth / 540),
        height: card.offsetHeight,
      });
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    observer.observe(card);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <section className="mx-auto max-w-[620px] px-4 py-8">
      <div className="mb-6">
        <h1 className="font-condensed text-3xl font-900 uppercase text-[var(--text)]">
          {title}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          O card e a legenda já estão prontos para compartilhar.
        </p>
      </div>
      <div
        ref={wrapperRef}
        style={{ height: size.height * size.scale, overflow: "hidden" }}
      >
        <div
          style={{
            width: 540,
            transform: `scale(${size.scale})`,
            transformOrigin: "top left",
          }}
        >
          <div ref={cardRef} style={{ width: 540, backgroundColor: "#101010" }}>
            {children}
          </div>
        </div>
      </div>
      {canShare && (
        <div className="mt-6">
          <ShareActions
            key={shareCaption}
            cardRef={cardRef}
            filename={filename}
            shareCaption={shareCaption}
            whatsappTextUrl={`https://wa.me/?text=${encodeURIComponent(shareCaption)}`}
          />
        </div>
      )}
      <div className="mt-6 text-center">
        <Link
          href="/register"
          className="inline-flex min-h-11 items-center px-4 font-condensed text-sm font-800 uppercase tracking-wide text-[var(--text)] underline underline-offset-4"
        >
          Criar minha conta no UFC Fantasy
        </Link>
      </div>
    </section>
  );
}
