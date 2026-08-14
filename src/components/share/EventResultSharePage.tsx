"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatEventDate } from "@/lib/utils";
import PublicShareHeader from "@/components/share/PublicShareHeader";
import ShareActions from "@/components/share/ShareActions";

type ShareData = NonNullable<Awaited<ReturnType<typeof import("@/server/services/app").getPublicEventResultShareData>>>;

function fighterName(fighter: any) {
  if (Array.isArray(fighter)) return fighter[0]?.name || "";
  return fighter?.name || "";
}

function safeFilenamePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "jogador";
}

function compactLabel(name: string) {
  return name.length > 28 ? `${name.slice(0, 25)}...` : name;
}

const METHOD_ABBR: Record<string, string> = { knockout: "KO", submission: "SUB", decision: "DEC" };

function pickMethodAbbr(method?: string | null) {
  return method ? METHOD_ABBR[method] || method : "";
}

function getWinnerName(fight: any) {
  if (!fight.winner_id) return "";
  if (fight.fighter_a?.id === fight.winner_id) return fighterName(fight.fighter_a);
  if (fight.fighter_b?.id === fight.winner_id) return fighterName(fight.fighter_b);
  return "";
}

function formatMr(method?: string | null, round?: number | null) {
  const a = pickMethodAbbr(method);
  if (!a) return "";
  if (method === "decision") return a;
  return round ? `${a} ${round}RD` : a;
}

const GRID = [
  "repeating-linear-gradient(45deg, transparent, transparent 39px, rgba(42,42,42,0.08) 39px, rgba(42,42,42,0.08) 40px)",
  "repeating-linear-gradient(-45deg, transparent, transparent 39px, rgba(42,42,42,0.08) 39px, rgba(42,42,42,0.08) 40px)",
].join(", ");

const HERO_OVERLAY =
  "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(13,13,13,0.45) 40%, rgba(13,13,13,0.95) 100%)";

export default function EventResultSharePage({ data, shareUrl }: { data: ShareData; shareUrl: string }) {
  const { event, profile, picks, score, rank, status } = data;
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [cardScale, setCardScale] = useState(0.65);
  const pickMap = new Map((picks || []).map((pick: any) => [pick.fight_id, pick]));

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setCardScale(Math.min(1, Math.max(0.35, (w - 8) / 540)));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const totalPoints = Number(score?.total_points || 0);
  const perfectPicks = Number((score as any)?.perfect_picks ?? (picks.filter((pick: any) => pick.total_points === 3).length || 0));
  const winnersHit = picks.filter((pick: any) => Number(pick.points_winner || 0) > 0).length;
  const totalPicks = picks.length;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`Veja meu resultado no ${event.name}: ${profile.nickname} fez ${totalPoints} pts no UFC Fantasy ${shareUrl}`)}`;
  const shareCaption = `${profile.nickname} fez ${totalPoints} pontos no ${event.name} pelo UFC Fantasy. Veja o resultado e entre no jogo: ${shareUrl}`;
  const filename = `ufc-fantasy-result-${event.slug}-${safeFilenamePart(profile.nickname)}.png`;
  const sortedFights = (event.fights || [])
    .slice()
    .sort((a: any, b: any) => a.fight_order - b.fight_order);
  const hasBanner = !!event.banner_image_url;

  return (
    <main className="min-h-[100dvh]" style={{ backgroundColor: "var(--bg)" }}>
      <PublicShareHeader />
      <section className="mx-auto max-w-5xl px-4 py-8">
        <div
          ref={wrapperRef}
          className="flex justify-center overflow-hidden pb-3"
          style={{ maxHeight: "calc(100dvh - 260px)" }}
        >
          <div style={{ transform: `scale(${cardScale})`, transformOrigin: "top center" }}>
          <div
            ref={cardRef}
            className="font-condensed"
            style={{
              width: 540,
              height: 960,
              background: "#0d0d0d",
              color: "#f0f0f0",
              padding: 16,
              boxShadow: "0 28px 70px rgba(0,0,0,0.28)",
            }}
          >
            <div
              style={{
                height: "100%",
                border: "1px solid #2a2a2a",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* ── Hero section ── */}
              <div
                style={{
                  position: "relative",
                  height: 380,
                  flexShrink: 0,
                  overflow: "hidden",
                  background: "#141414",
                }}
              >
                {hasBanner && (
                  // Imagem literal necessária para o html-to-image capturar o card.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={event.banner_image_url!}
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
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: HERO_OVERLAY,
                  }}
                />

                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    height: "100%",
                    padding: "28px 28px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  {/* Brand + date */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className="text-[12px] font-900 uppercase tracking-[0.2em]"
                        style={{ color: "#e8001a" }}
                      >
                        UFC Fantasy
                      </p>
                      <p
                        className="mt-1 text-[12px] font-500 uppercase tracking-widest"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                      >
                        {formatEventDate(event.event_date)}
                      </p>
                    </div>
                    <p
                      className="max-w-[180px] text-right text-[13px] font-700 uppercase tracking-widest leading-tight"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      {event.name}
                    </p>
                  </div>

                  {/* Center content */}
                  {status === "not_public_yet" ? (
                    <div className="text-center">
                      <p className="text-[34px] font-900 uppercase leading-none tracking-wide">
                        Resultado
                        <br />
                        privado
                      </p>
                      <p
                        className="mx-auto mt-4 max-w-[240px] text-[15px] font-500 uppercase tracking-widest leading-snug"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                      >
                        Os resultados ficam públicos após o fechamento do evento
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Nickname */}
                      <div className="text-center">
                        <p
                          className="text-[20px] font-500 uppercase tracking-[0.18em]"
                          style={{ color: "rgba(255,255,255,0.5)" }}
                        >
                          Resultado
                        </p>
                        <h1
                          className="-mt-1 text-[66px] font-900 uppercase leading-[0.88] tracking-tight"
                          style={{ color: "#f0f0f0" }}
                        >
                          {profile.nickname}
                        </h1>
                      </div>

                      {/* 3 stat columns */}
                      <div
                        style={{
                          borderTop: "1px solid rgba(255,255,255,0.08)",
                          paddingTop: 14,
                        }}
                      >
                        <div className="grid grid-cols-3 text-center">
                          {[
                            { label: "MEUS PICKS", value: totalPicks, highlight: false },
                            { label: "RESULTADOS", value: winnersHit, highlight: false },
                            { label: "PONTOS", value: totalPoints, highlight: true },
                          ].map((col, i) => (
                            <div
                              key={col.label}
                              style={{
                                borderLeft: i ? "1px solid rgba(255,255,255,0.08)" : "none",
                              }}
                            >
                              <p
                                className="text-[34px] font-900 leading-none"
                                style={{
                                  color: col.highlight ? "#e8001a" : "#f0f0f0",
                                }}
                              >
                                {col.value}
                              </p>
                              <p
                                className="mt-1 text-[10px] font-500 uppercase tracking-[0.18em]"
                                style={{ color: "rgba(255,255,255,0.35)" }}
                              >
                                {col.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Body section ── */}
              <div
                style={{
                  flex: 1,
                  background: `#141414`,
                  padding: "20px 24px 18px",
                  display: "flex",
                  flexDirection: "column",
                  backgroundImage: GRID,
                }}
              >
                {status === "public" && (
                  <>
                    {/* Event rank */}
                    {rank && (
                      <div
                        className="mb-4 flex items-center gap-2"
                        style={{
                          borderBottom: "1px solid #2a2a2a",
                          paddingBottom: 12,
                        }}
                      >
                        <span
                          className="inline-flex items-center justify-center text-[10px] font-900 uppercase tracking-widest"
                          style={{
                            height: 20,
                            padding: "0 8px",
                            background: "#e8001a",
                            color: "#f0f0f0",
                          }}
                        >
                          #{rank} no evento
                        </span>
                      </div>
                    )}

                    {/* Column headers */}
                    <div
                      className="flex items-center gap-2"
                      style={{
                        paddingLeft: 9,
                        paddingRight: 10,
                        borderBottom: "1px solid #2a2a2a",
                        paddingBottom: 7,
                      }}
                    >
                      <span
                        className="w-[18px] shrink-0 text-right text-[9px] font-500 uppercase tracking-[0.18em]"
                        style={{ color: "#555" }}
                      />
                      <span
                        className="min-w-0 flex-[3] text-[9px] font-500 uppercase tracking-[0.18em]"
                        style={{ color: "#555" }}
                      >
                        Meu pick
                      </span>
                      <span className="w-px shrink-0 self-stretch" style={{ background: "#333" }} />
                      <span
                        className="min-w-0 flex-[2] pl-3 text-[9px] font-500 uppercase tracking-[0.18em]"
                        style={{ color: "#555" }}
                      >
                        Resultado
                      </span>
                      <span className="w-px shrink-0 self-stretch" style={{ background: "#333" }} />
                      <span
                        className="w-[60px] shrink-0 pl-3 text-[9px] font-500 uppercase tracking-[0.18em]"
                        style={{ color: "#555" }}
                      >
                        Pts
                      </span>
                    </div>

                    {/* Fight rows */}
                    <div className="flex-1 space-y-[5px] overflow-hidden">
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
                          <div
                            key={fight.id}
                            className="flex items-center gap-2"
                            style={{
                              height: 34,
                              background: "#1a1a1a",
                              borderLeft: hasPick
                                ? "3px solid #e8001a"
                                : "3px solid transparent",
                              paddingLeft: hasPick ? 9 : 12,
                              paddingRight: 10,
                            }}
                          >
                            {/* # */}
                            <span
                              className="w-[18px] shrink-0 self-start text-right text-[11px] font-700"
                              style={{ color: "#555", marginTop: 9 }}
                            >
                              {index + 1}
                            </span>

                            {/* Meu Pick */}
                            <div className="flex min-w-0 flex-[3] items-baseline justify-between gap-3">
                              <span
                                className="truncate text-[12px] font-700"
                                style={{ color: hasPick ? "#f0f0f0" : "#555" }}
                              >
                                {hasPick ? compactLabel(pickedName) : "Sem pick"}
                              </span>
                              {pickMr && (
                                <span
                                  className="shrink-0 text-[9px] font-500"
                                  style={{ color: "#666" }}
                                >
                                  {pickMr}
                                </span>
                              )}
                            </div>

                            {/* Divider */}
                            <span
                              className="w-px shrink-0 self-stretch"
                              style={{ background: "#333" }}
                            />

                            {/* Resultado */}
                            <div className="flex min-w-0 flex-[2] items-baseline justify-between gap-3 pl-3">
                              <span
                                className="truncate text-[12px] font-700"
                                style={{ color: isCorrect ? "#22c55e" : "#555" }}
                              >
                                {winnerName ? compactLabel(winnerName) : "-"}
                              </span>
                              {resultMr && (
                                <span
                                  className="shrink-0 text-[9px] font-500"
                                  style={{ color: isCorrect ? "#22c55e" : "#555" }}
                                >
                                  {resultMr}
                                </span>
                              )}
                            </div>

                            {/* Divider */}
                            <span
                              className="w-px shrink-0 self-stretch"
                              style={{ background: "#333" }}
                            />

                            {/* Pontos */}
                            <span
                              className="w-[60px] shrink-0 pl-3 text-right text-[13px] font-900"
                              style={{
                                color: totalPts > 0 ? "#e8001a" : "#555",
                              }}
                            >
                              {totalPts}
                              <span
                                className="ml-[1px] text-[9px] font-500"
                                style={{ color: totalPts > 0 ? "#e8001a" : "#555" }}
                              >
                              pts
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer */}
                    <div
                      className="mt-4 pt-4 text-center"
                      style={{ borderTop: "1px solid #2a2a2a" }}
                    >
                      <p
                        className="text-[13px] font-500 tracking-[0.12em]"
                        style={{ color: "#555" }}
                      >
                        ufc-fantasy.vercel.app · monte o seu
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>

        {status === "public" && (
          <div className="mt-8">
            <ShareActions
              cardRef={cardRef}
              filename={filename}
              shareCaption={shareCaption}
              whatsappTextUrl={whatsappHref}
            />
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <Link
            href="/register"
            className="px-5 py-3 text-center font-condensed text-sm font-900 uppercase tracking-widest"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Criar minha conta
          </Link>
        </div>
      </section>
    </main>
  );
}
