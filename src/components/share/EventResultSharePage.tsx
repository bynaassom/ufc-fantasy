"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PublicShareHeader from "@/components/share/PublicShareHeader";
import ShareActions from "@/components/share/ShareActions";
import EventResultCard, {
  resultMetrics,
  type ResultCardData,
} from "./EventResultCard";

type ShareData = NonNullable<
  Awaited<
    ReturnType<
      typeof import("@/server/services/app").getPublicEventResultShareData
    >
  >
>;

export function EventResultShareContent({
  data,
  shareUrl,
}: {
  data: ResultCardData;
  shareUrl: string;
}) {
  const { event, profile, status } = data;
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: 0.6, height: 700 });
  const metrics = resultMetrics(data);

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

  const shareCaption = [
    `🥊 ${profile.nickname} no ${event.name}`,
    "",
    `🏆 ${metrics.points} pontos${data.rank ? ` · #${data.rank} no evento` : ""}`,
    `🎯 ${metrics.correct}/${metrics.total} vencedores certos`,
    `🔥 ${metrics.perfect} ${metrics.perfect === 1 ? "cravada perfeita" : "cravadas perfeitas"}`,
    "",
    "E aí, como foi o seu card? Confira meu resultado no UFC Fantasy:",
    shareUrl,
  ].join("\n");
  const safeNickname =
    profile.nickname
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "jogador";
  const filename = `ufc-fantasy-result-${event.slug}-${safeNickname}.png`;
  const siteHost = (() => {
    try {
      return new URL(shareUrl).host;
    } catch {
      return "UFC Fantasy";
    }
  })();

  return (
    <section className="mx-auto max-w-[620px] px-4 py-8">
      <div className="mb-6">
        <h1 className="font-condensed text-3xl font-900 uppercase text-[var(--text)]">
          Seu resultado merece o grupo.
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
          <EventResultCard data={data} cardRef={cardRef} siteHost={siteHost} />
        </div>
      </div>
      {status === "public" && (
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

export default function EventResultSharePage({
  data,
  shareUrl,
}: {
  data: ShareData;
  shareUrl: string;
}) {
  return (
    <main className="min-h-[100dvh] bg-[var(--bg)]">
      <PublicShareHeader />
      <EventResultShareContent data={data} shareUrl={shareUrl} />
    </main>
  );
}
