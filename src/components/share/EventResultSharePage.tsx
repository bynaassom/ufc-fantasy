"use client";

import PublicShareHeader from "./PublicShareHeader";
import EventResultCard, {
  resultMetrics,
  type ResultCardData,
} from "./EventResultCard";
import EventShareContent, { sharePageDetails } from "./EventShareContent";

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
  const metrics = resultMetrics(data);
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
  const { filename, siteHost } = sharePageDetails(
    "result",
    event.slug,
    profile.nickname,
    shareUrl,
  );
  return (
    <EventShareContent
      title="Seu resultado merece o grupo."
      shareCaption={shareCaption}
      filename={filename}
      shareUrl={shareUrl}
      canShare={status === "public"}
    >
      <EventResultCard data={data} siteHost={siteHost} />
    </EventShareContent>
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
