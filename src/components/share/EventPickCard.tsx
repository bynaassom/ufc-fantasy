"use client";

import type { Ref } from "react";
import type { ResultCardData } from "./EventResultCard";
import EventShareCardFrame, {
  shareMuted as muted,
  shareLabel as label,
  formatShareMethod,
} from "./EventShareCardFrame";

export type PickCardData = Pick<
  ResultCardData,
  "event" | "profile" | "picks" | "status"
>;

export default function EventPickCard({
  data,
  cardRef,
  siteHost,
}: {
  data: PickCardData;
  cardRef?: Ref<HTMLDivElement>;
  siteHost: string;
}) {
  const { event, profile, picks, status } = data;
  const pickMap = new Map(picks.map((pick) => [pick.fight_id, pick]));
  const fights = [...event.fights].sort((a, b) =>
    a.card_type !== b.card_type
      ? a.card_type === "main"
        ? -1
        : 1
      : a.fight_order - b.fight_order,
  );
  const confirmed = picks.filter((pick) => pick.is_confirmed).length;

  return (
    <EventShareCardFrame
      event={event}
      cardRef={cardRef}
      siteHost={siteHost}
      badge="Meus picks"
    >
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
                Tá lançado. Estes são meus palpites.
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
                {picks.length}
              </strong>
              <span
                style={{
                  ...label,
                  display: "block",
                  marginTop: 10,
                  color: "#ff8592",
                }}
              >
                palpites
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
                {confirmed}
              </strong>
              <span style={{ ...label, marginLeft: 10, color: muted }}>
                confirmados
              </span>
            </div>
            <div
              style={{
                borderLeft: "1px solid #383838",
                paddingLeft: 25,
                flex: 1,
              }}
            >
              <strong style={{ fontSize: 28, fontWeight: 900 }}>
                {fights.length}
              </strong>
              <span style={{ ...label, marginLeft: 10, color: muted }}>
                lutas no card
              </span>
            </div>
          </div>
          <div
            style={{
              ...label,
              color: muted,
              paddingBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <span>Meu card</span>
            <span>Vencedor · método · round</span>
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
              const opponent =
                chosen?.id === fight.fighter_a_id
                  ? fight.fighter_b
                  : fight.fighter_a;
              return (
                <div
                  key={fight.id}
                  style={{
                    padding: "14px 0",
                    borderTop: "1px solid #303030",
                    minWidth: 0,
                  }}
                >
                  <p
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      lineHeight: 1.15,
                      overflowWrap: "anywhere",
                      color: chosen ? "#f5f3ee" : muted,
                    }}
                  >
                    {chosen?.name || "Sem palpite"}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: muted,
                      marginTop: 5,
                      lineHeight: 1.2,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {chosen
                      ? `vs. ${opponent.name}`
                      : `${fight.fighter_a.name} × ${fight.fighter_b.name}`}
                  </p>
                  {pick && (
                    <p
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#ff8592",
                        marginTop: 7,
                      }}
                    >
                      {formatShareMethod(pick.picked_method, pick.picked_round)}
                    </p>
                  )}
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
          <h1 style={{ fontSize: 32, fontWeight: 900 }}>Palpites privados</h1>
          <p style={{ color: muted, marginTop: 12 }}>
            Disponíveis após o fechamento dos palpites.
          </p>
        </div>
      )}
    </EventShareCardFrame>
  );
}
