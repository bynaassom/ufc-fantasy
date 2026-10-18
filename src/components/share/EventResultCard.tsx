"use client";

import { useState, type CSSProperties, type Ref } from "react";
import { getImageProps } from "next/image";
import { shouldOptimizeRemoteImage } from "@/lib/image-optimization";
import type { EventWithFights, Pick } from "@/types";
import { formatEventDate } from "@/lib/utils";

export type ResultCardData = {
  event: EventWithFights;
  profile: { nickname: string };
  picks: Pick[];
  score: { total_points: number; perfect_picks?: number | null } | null;
  rank: number | null;
  status: "public" | "not_public_yet";
};

export function resultMetrics(data: ResultCardData) {
  return {
    points: Number(data.score?.total_points ?? 0),
    perfect: Number(
      data.score?.perfect_picks ??
        data.picks.filter((pick) => pick.total_points === 3).length,
    ),
    correct: data.picks.filter((pick) => pick.points_winner > 0).length,
    total: data.picks.length,
  };
}

const muted = "#aaa9a5";
const label: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.09em",
};
const methods: Record<string, string> = {
  knockout: "KO/TKO",
  submission: "SUB",
  decision: "DEC",
  disqualification: "DQ",
};
function methodLabel(method?: string | null, round?: number | null) {
  if (!method) return "";
  return `${methods[method] || method}${method !== "decision" && round ? ` · R${round}` : ""}`;
}

export default function EventResultCard({
  data,
  cardRef,
  siteHost,
}: {
  data: ResultCardData;
  cardRef?: Ref<HTMLDivElement>;
  siteHost: string;
}) {
  const { event, profile, picks, rank, status } = data;
  const metrics = resultMetrics(data);
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
  const pickMap = new Map(picks.map((pick) => [pick.fight_id, pick]));
  const fights = [...event.fights].sort((a, b) => {
    if (a.card_type !== b.card_type) return a.card_type === "main" ? -1 : 1;
    return a.fight_order - b.fight_order;
  });

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
        <span style={{ ...label, color: muted }}>
          {event.status === "completed"
            ? "Resultado final"
            : "Resultado parcial"}
        </span>
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

      {status === "public" ? (
        <>
          <div
            style={{
              padding: "25px 0 22px",
              display: "flex",
              gap: 18,
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1
                style={{
                  fontSize: 38,
                  fontWeight: 900,
                  lineHeight: 1.05,
                  overflowWrap: "anywhere",
                  textTransform: "uppercase",
                }}
              >
                {profile.nickname}
              </h1>
              <p style={{ ...label, color: muted, marginTop: 12 }}>
                {rank
                  ? `#${rank} no ranking do evento`
                  : "Meu resultado no evento"}
              </p>
            </div>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              <strong
                style={{
                  display: "block",
                  fontSize: 86,
                  fontWeight: 900,
                  lineHeight: 0.85,
                  letterSpacing: "-0.03em",
                  color: "#ff4b5e",
                }}
              >
                {metrics.points}
              </strong>
              <span
                style={{
                  ...label,
                  display: "block",
                  marginTop: 10,
                  color: "#ff8592",
                }}
              >
                pontos
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "18px 0",
              borderTop: "1px solid #383838",
              borderBottom: "1px solid #383838",
              marginBottom: 22,
            }}
          >
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 28, fontWeight: 900 }}>
                {metrics.correct}
                <span style={{ color: muted, fontWeight: 500, fontSize: 20 }}>
                  {" "}
                  / {metrics.total}
                </span>
              </strong>
              <span style={{ ...label, marginLeft: 10, color: muted }}>
                vencedores
              </span>
            </div>
            <div
              style={{
                borderLeft: "1px solid #383838",
                paddingLeft: 25,
                flex: 1,
              }}
            >
              <strong
                style={{ fontSize: 28, fontWeight: 900, color: "#e5c77d" }}
              >
                {metrics.perfect}
              </strong>
              <span style={{ ...label, marginLeft: 10, color: muted }}>
                {metrics.perfect === 1 ? "cravada" : "cravadas"}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingBottom: 12,
              ...label,
              color: muted,
            }}
          >
            <span>Meu card</span>
            <span>Dourado = cravada perfeita</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              columnGap: 24,
            }}
          >
            {fights.map((fight) => {
              const pick = pickMap.get(fight.id);
              const chosen =
                pick?.picked_winner_id === fight.fighter_a_id
                  ? fight.fighter_a
                  : pick?.picked_winner_id === fight.fighter_b_id
                    ? fight.fighter_b
                    : undefined;
              const points = Number(pick?.total_points ?? 0);
              const winner =
                fight.winner_id === fight.fighter_a_id
                  ? fight.fighter_a
                  : fight.winner_id === fight.fighter_b_id
                    ? fight.fighter_b
                    : undefined;
              const outcome = !fight.result_confirmed
                ? "Aguardando resultado"
                : [
                    winner
                      ? winner.id === chosen?.id
                        ? "Acertou o vencedor"
                        : `Venceu: ${winner.name}`
                      : "Sem vencedor",
                    methodLabel(fight.result_method, fight.result_round),
                  ]
                    .filter(Boolean)
                    .join(" · ");
              return (
                <div
                  key={fight.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 0",
                    borderTop: "1px solid #303030",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        lineHeight: 1.15,
                        overflowWrap: "anywhere",
                        color: points > 0 ? "#f5f3ee" : "#bab8b4",
                      }}
                    >
                      {chosen?.name || "Sem palpite"}
                    </p>
                    <p style={{ fontSize: 12, color: muted, marginTop: 5 }}>
                      {pick
                        ? methodLabel(pick.picked_method, pick.picked_round)
                        : `${fight.fighter_a.name} × ${fight.fighter_b.name}`}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        lineHeight: 1.2,
                        color: muted,
                        marginTop: 4,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {outcome}
                    </p>
                  </div>
                  <strong
                    style={{
                      flexShrink: 0,
                      fontSize: 26,
                      fontWeight: 900,
                      color:
                        points === 3
                          ? "#e5c77d"
                          : points > 0
                            ? "#ff6b7b"
                            : muted,
                    }}
                  >
                    {fight.result_confirmed && pick ? `+${points}` : "—"}
                  </strong>
                </div>
              );
            })}
          </div>
          {!fights.length && (
            <p style={{ color: muted, padding: "20px 0" }}>
              Nenhuma luta disponível neste evento.
            </p>
          )}
        </>
      ) : (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <h1 style={{ fontSize: 32, fontWeight: 900 }}>Resultado privado</h1>
          <p style={{ color: muted, marginTop: 12 }}>
            Disponível após o fechamento dos palpites.
          </p>
        </div>
      )}

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
