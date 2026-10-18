"use client";

import PublicShareHeader from "./PublicShareHeader";
import EventPickCard, { type PickCardData } from "./EventPickCard";
import EventShareContent, { sharePageDetails } from "./EventShareContent";

type ShareData = NonNullable<
  Awaited<
    ReturnType<
      typeof import("@/server/services/app").getPublicEventPickShareData
    >
  >
>;

export function EventPickShareContent({
  data,
  shareUrl,
}: {
  data: PickCardData;
  shareUrl: string;
}) {
  const { event, profile, picks, status } = data;
  const shareCaption = [
    `🥊 Os picks de ${profile.nickname} para o ${event.name}`,
    "",
    `🎯 ${picks.length} ${picks.length === 1 ? "palpite" : "palpites"} para ${event.fights.length} lutas`,
    "",
    "Tá lançado! Concorda com meu card? Confira meus picks no UFC Fantasy e mande os seus:",
    shareUrl,
  ].join("\n");
  const { filename, siteHost } = sharePageDetails(
    "picks",
    event.slug,
    profile.nickname,
    shareUrl,
  );
  return (
    <EventShareContent
      title="Seus picks merecem o grupo."
      shareCaption={shareCaption}
      filename={filename}
      shareUrl={shareUrl}
      canShare={status === "public"}
    >
      <EventPickCard data={data} siteHost={siteHost} />
    </EventShareContent>
  );
}

export default function EventPickSharePage({
  data,
  shareUrl,
}: {
  data: ShareData;
  shareUrl: string;
}) {
  return (
    <main className="min-h-[100dvh] bg-[var(--bg)]">
      <PublicShareHeader />
      <EventPickShareContent data={data} shareUrl={shareUrl} />
    </main>
  );
}
