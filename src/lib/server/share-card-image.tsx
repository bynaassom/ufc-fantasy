import type { CSSProperties, ReactElement } from "react";
import { formatEventDate } from "@/lib/utils";

type PickShareData = NonNullable<Awaited<ReturnType<typeof import("@/server/services/app").getPublicEventPickShareData>>>;
type ResultShareData = NonNullable<Awaited<ReturnType<typeof import("@/server/services/app").getPublicEventResultShareData>>>;

const W = 1080;
const H = 1920;
const RED = "#e8001a";
const BG = "#0d0d0d";
const CARD = "#141414";
const ROW = "#1a1a1a";
const BORDER = "#2a2a2a";
const TEXT = "#f0f0f0";
const MUTED = "#555";

export const SHARE_IMAGE_SIZE = { width: W, height: H };

function fighterName(fighter: any) {
  if (Array.isArray(fighter)) return fighter[0]?.name || "";
  return fighter?.name || "";
}

function compactLabel(name: string, max = 24) {
  return name.length > max ? `${name.slice(0, max - 3)}...` : name;
}

const METHOD_ABBR: Record<string, string> = { knockout: "KO", submission: "SUB", decision: "DEC" };

function methodAbbr(method?: string | null) {
  return method ? METHOD_ABBR[method] || method : "";
}

function formatMr(method?: string | null, round?: number | null) {
  const abbr = methodAbbr(method);
  if (!abbr) return "";
  if (method === "decision") return abbr;
  return round ? `${abbr} ${round}RD` : abbr;
}

function getWinnerName(fight: any) {
  if (!fight.winner_id) return "";
  if (fight.fighter_a?.id === fight.winner_id) return fighterName(fight.fighter_a);
  if (fight.fighter_b?.id === fight.winner_id) return fighterName(fight.fighter_b);
  return "";
}

function pickLine(name: string, hasPick: boolean, method?: string | null, round?: number | null) {
  if (!hasPick) return "Sem pick";
  const mr = formatMr(method, round);
  return `${compactLabel(name, 28)}${mr ? ` ${mr}` : ""}`;
}

const rootStyle: CSSProperties = {
  width: W,
  height: H,
  display: "flex",
  flexDirection: "column",
  backgroundColor: BG,
  color: TEXT,
  padding: 32,
  fontFamily: "Arial Narrow, Arial, sans-serif",
};

const frameStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  border: `2px solid ${BORDER}`,
  overflow: "hidden",
};

const heroStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: 760,
  display: "flex",
  flexShrink: 0,
  overflow: "hidden",
  backgroundColor: CARD,
};

const heroOverlayStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(13,13,13,0.45) 40%, rgba(13,13,13,0.95) 100%)",
};

const heroContentStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "56px 56px 40px",
};

const bodyStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  backgroundColor: CARD,
  padding: "40px 48px 36px",
};

function Hero({
  event,
  bannerUrl,
  title,
  subtitle,
  status,
  stats,
}: {
  event: any;
  bannerUrl?: string | null;
  title: string;
  subtitle: string;
  status: "public" | "not_public_yet";
  stats: { label: string; value: number; highlight?: boolean }[];
}) {
  return (
    <div style={heroStyle}>
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: event.banner_object_position || "center",
          }}
        />
      ) : null}
      <div style={heroOverlayStyle} />
      <div style={heroContentStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", color: RED, fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em" }}>
              UFC Fantasy
            </div>
            <div style={{ display: "flex", marginTop: 8, color: "rgba(255,255,255,0.45)", fontSize: 24, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.18em" }}>
              {formatEventDate(event.event_date)}
            </div>
          </div>
          <div style={{ display: "flex", maxWidth: 360, color: "rgba(255,255,255,0.7)", fontSize: 26, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1.1, textAlign: "right" }}>
            {event.name}
          </div>
        </div>

        {status === "not_public_yet" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
            <div style={{ display: "flex", fontSize: 68, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.9, letterSpacing: "0.04em" }}>
              {title}
            </div>
            <div style={{ display: "flex", marginTop: 28, maxWidth: 480, color: "rgba(255,255,255,0.45)", fontSize: 30, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.12em", lineHeight: 1.15 }}>
              {subtitle}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ display: "flex", color: "rgba(255,255,255,0.5)", fontSize: 40, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                {title}
              </div>
              <div style={{ display: "flex", marginTop: -2, fontSize: 132, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.88, letterSpacing: "-0.02em" }}>
                {subtitle}
              </div>
            </div>
            <div style={{ display: "flex", borderTop: "2px solid rgba(255,255,255,0.08)", paddingTop: 28 }}>
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    borderLeft: index ? "2px solid rgba(255,255,255,0.08)" : "none",
                  }}
                >
                  <div style={{ display: "flex", color: stat.highlight ? RED : TEXT, fontSize: 68, fontWeight: 900, lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ display: "flex", marginTop: 8, color: "rgba(255,255,255,0.35)", fontSize: 20, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.18em" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Footer({ text }: { text: string }) {
  return (
    <div style={{ marginTop: 32, paddingTop: 32, display: "flex", justifyContent: "center", borderTop: `2px solid ${BORDER}` }}>
      <div style={{ display: "flex", color: MUTED, fontSize: 26, fontWeight: 500, letterSpacing: "0.12em" }}>{text}</div>
    </div>
  );
}

export function renderPickShareCardImage(data: PickShareData, bannerUrl?: string | null): ReactElement {
  const { event, profile, picks, status } = data;
  const pickMap = new Map((picks || []).map((pick: any) => [pick.fight_id, pick]));
  const sortedFights = (event.fights || []).slice().sort((a: any, b: any) => a.fight_order - b.fight_order);
  const totalPicks = picks.length;
  const lockedPicks = picks.filter((p: any) => p.is_confirmed).length;

  return (
    <div style={rootStyle}>
      <div style={frameStyle}>
        <Hero
          event={event}
          bannerUrl={bannerUrl}
          status={status}
          title={status === "not_public_yet" ? "Palpites\nprivados" : "Palpites de"}
          subtitle={status === "not_public_yet" ? "Os picks ficam públicos após o fechamento do evento" : profile.nickname}
          stats={[
            { label: "Picks", value: totalPicks },
            { label: "Confirmados", value: lockedPicks },
            { label: "Lutas", value: sortedFights.length },
          ]}
        />
        <div style={bodyStyle}>
          {status === "public" ? (
            <>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden" }}>
                {sortedFights.map((fight: any, index: number) => {
                  const pick = pickMap.get(fight.id) as any;
                  const pickedName =
                    pick?.picked_winner_id === fight.fighter_a_id
                      ? fighterName(fight.fighter_a)
                      : pick?.picked_winner_id === fight.fighter_b_id
                        ? fighterName(fight.fighter_b)
                        : "";
                  const hasPick = !!pick;
                  return (
                    <div key={fight.id} style={{ height: 60, display: "flex", alignItems: "center", gap: 20, backgroundColor: ROW, borderLeft: hasPick ? `6px solid ${RED}` : "6px solid transparent", padding: "0 20px 0 18px" }}>
                      <div style={{ display: "flex", width: 36, color: MUTED, fontSize: 24, fontWeight: 700, textAlign: "right" }}>{index + 1}</div>
                      <div style={{ display: "flex", flex: 1, color: hasPick ? TEXT : MUTED, fontSize: 26, fontWeight: 700 }}>{hasPick ? pickLine(pickedName, true, pick.picked_method, pick.picked_round) : "Sem pick"}</div>
                    </div>
                  );
                })}
              </div>
              <Footer text="ufc-fantasy.vercel.app · faça seus picks" />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function renderResultShareCardImage(data: ResultShareData, bannerUrl?: string | null): ReactElement {
  const { event, profile, picks, score, rank, status } = data;
  const pickMap = new Map((picks || []).map((pick: any) => [pick.fight_id, pick]));
  const sortedFights = (event.fights || []).slice().sort((a: any, b: any) => a.fight_order - b.fight_order);
  const totalPoints = Number(score?.total_points || 0);
  const winnersHit = picks.filter((pick: any) => Number(pick.points_winner || 0) > 0).length;
  const totalPicks = picks.length;

  return (
    <div style={rootStyle}>
      <div style={frameStyle}>
        <Hero
          event={event}
          bannerUrl={bannerUrl}
          status={status}
          title={status === "not_public_yet" ? "Resultado\nprivado" : "Resultado"}
          subtitle={status === "not_public_yet" ? "Os resultados ficam públicos após o fechamento do evento" : profile.nickname}
          stats={[
            { label: "MEUS PICKS", value: totalPicks },
            { label: "RESULTADOS", value: winnersHit },
            { label: "PONTOS", value: totalPoints, highlight: true },
          ]}
        />
        <div style={bodyStyle}>
          {status === "public" ? (
            <>
              {rank ? (
                <div style={{ marginBottom: 24, paddingBottom: 24, display: "flex", borderBottom: `2px solid ${BORDER}` }}>
                  <div style={{ height: 40, display: "flex", alignItems: "center", backgroundColor: RED, color: TEXT, padding: "0 16px", fontSize: 20, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.12em" }}>#{rank} no evento</div>
                </div>
              ) : null}

              <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 20px 14px 18px", borderBottom: `2px solid ${BORDER}`, borderLeft: "6px solid transparent" }}>
                <div style={{ display: "flex", width: 36 }} />
                <div style={{ display: "flex", flex: 3, color: MUTED, fontSize: 18, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.18em" }}>Meu pick</div>
                <div style={{ width: 2, alignSelf: "stretch", backgroundColor: "#333" }} />
                <div style={{ display: "flex", flex: 2, color: MUTED, fontSize: 18, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.18em", paddingLeft: 24 }}>Resultado</div>
                <div style={{ width: 2, alignSelf: "stretch", backgroundColor: "#333" }} />
                <div style={{ display: "flex", width: 120, color: MUTED, fontSize: 18, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.18em", paddingLeft: 24 }}>Pts</div>
              </div>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, overflow: "hidden", marginTop: 10 }}>
                {sortedFights.map((fight: any, index: number) => {
                  const pick = pickMap.get(fight.id) as any;
                  const pickedName =
                    pick?.picked_winner_id === fight.fighter_a_id
                      ? fighterName(fight.fighter_a)
                      : pick?.picked_winner_id === fight.fighter_b_id
                        ? fighterName(fight.fighter_b)
                        : "";
                  const hasPick = !!pick;
                  const winnerName = getWinnerName(fight);
                  const isCorrect = hasPick && pick?.picked_winner_id === fight.winner_id;
                  const totalPts = Number(pick?.total_points || 0);
                  const pickMr = hasPick ? formatMr(pick.picked_method, pick.picked_round) : "";
                  const resultMr = winnerName ? formatMr(fight.result_method, fight.result_round) : "";
                  return (
                    <div key={fight.id} style={{ height: 68, display: "flex", alignItems: "center", gap: 16, backgroundColor: ROW, borderLeft: hasPick ? `6px solid ${RED}` : "6px solid transparent", padding: "0 20px 0 18px" }}>
                      <div style={{ display: "flex", width: 36, color: MUTED, fontSize: 22, fontWeight: 700, textAlign: "right" }}>{index + 1}</div>
                      <div style={{ flex: 3, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
                        <div style={{ display: "flex", color: hasPick ? TEXT : MUTED, fontSize: 24, fontWeight: 700 }}>{hasPick ? compactLabel(pickedName, 18) : "Sem pick"}</div>
                        {pickMr ? <div style={{ display: "flex", color: "#666", fontSize: 18, fontWeight: 500 }}>{pickMr}</div> : null}
                      </div>
                      <div style={{ width: 2, alignSelf: "stretch", backgroundColor: "#333" }} />
                      <div style={{ flex: 2, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline", paddingLeft: 24 }}>
                        <div style={{ display: "flex", color: isCorrect ? "#22c55e" : MUTED, fontSize: 24, fontWeight: 700 }}>{winnerName ? compactLabel(winnerName, 14) : "-"}</div>
                        {resultMr ? <div style={{ display: "flex", color: isCorrect ? "#22c55e" : MUTED, fontSize: 18, fontWeight: 500 }}>{resultMr}</div> : null}
                      </div>
                      <div style={{ width: 2, alignSelf: "stretch", backgroundColor: "#333" }} />
                      <div style={{ width: 120, display: "flex", justifyContent: "flex-end", alignItems: "baseline", color: totalPts > 0 ? RED : MUTED, fontSize: 26, fontWeight: 900, paddingLeft: 24 }}>
                        {totalPts}<span style={{ marginLeft: 2, fontSize: 18, fontWeight: 500 }}>pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Footer text="ufc-fantasy.vercel.app · monte o seu" />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
