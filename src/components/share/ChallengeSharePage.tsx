"use client";

import { useRef } from "react";
import ChallengeShareCard from "@/components/share/ChallengeShareCard";
import ShareActions from "@/components/share/ShareActions";
import type { ChallengeShareData } from "@/types";

export default function ChallengeSharePage({
  data,
}: {
  data: ChallengeShareData;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const filename = `desafio-${data.challenger.nickname}-vs-${data.challenged.nickname}`;
  const shareCaption = `${data.challenger.nickname} × ${data.challenged.nickname} — ${data.eventName}`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const whatsappTextUrl = `https://wa.me/?text=${encodeURIComponent(`${data.challenger.nickname} × ${data.challenged.nickname} — ${data.eventName} ${shareUrl}`)}`;

  return (
    <div
      className="min-h-screen flex flex-col items-center py-8"
      style={{ backgroundColor: "var(--bg)", color: "var(--text)" }}
    >
      <div ref={cardRef}>
        <ChallengeShareCard data={data} />
      </div>
      <div className="mt-4">
        <ShareActions
          cardRef={cardRef}
          filename={filename}
          shareCaption={shareCaption}
          whatsappTextUrl={whatsappTextUrl}
        />
      </div>
    </div>
  );
}
