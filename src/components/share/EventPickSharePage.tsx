"use client";

import { useEffect, useRef, useState } from "react";
import { formatEventDate } from "@/lib/utils";
import PublicShareHeader from "@/components/share/PublicShareHeader";
import ShareActions from "@/components/share/ShareActions";
import ShareCta from "@/components/share/ShareCta";

type ShareData = NonNullable<Awaited<ReturnType<typeof import("@/server/services/app").getPublicEventPickShareData>>>;

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

function formatPickLine(name: string, hasPick: boolean, method?: string | null, round?: number | null) {
  if (!hasPick) return "Sem pick";
  const m = pickMethodAbbr(method);
  const r = round ? `${round}RD` : "";
  return `${compactLabel(name)} ${m} ${r}`.trim();
}

const GRID = [
  "repeating-linear-gradient(45deg, transparent, transparent 39px, rgba(42,42,42,0.08) 39px, rgba(42,42,42,0.08) 40px)",
  "repeating-linear-gradient(-45deg, transparent, transparent 39px, rgba(42,42,42,0.08) 39px, rgba(42,42,42,0.08) 40px)",
].join(", ");

const HERO_OVERLAY =
  "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(13,13,13,0.45) 40%, rgba(13,13,13,0.95) 100%)";

export default function EventPickSharePage({ data, shareUrl, bannerDataUrl, shareImageUrl }: { data: ShareData; shareUrl: string; bannerDataUrl?: string | null; shareImageUrl?: string }) {
  const { event, profile, picks, status } = data;
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
  const totalPicks = picks.length;
  const lockedPicks = picks.filter((p: any) => p.is_confirmed).length;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`Veja meus picks para o ${event.name}: ${profile.nickname} no UFC Fantasy ${shareUrl}`)}`;
  const shareCaption = `Meus palpites para o ${event.name} no UFC Fantasy. Entre no jogo e faça os seus: ${shareUrl}`;
  const filename = `ufc-fantasy-picks-${event.slug}-${safeFilenamePart(profile.nickname)}.png`;
  const sortedFights = (event.fights || [])
    .slice()
    .sort((a: any, b: any) => a.fight_order - b.fight_order);
  const hasBanner = !!event.banner_image_url;
  const [bannerLoaded, setBannerLoaded] = useState(!hasBanner);
  const proxyUrl = event.banner_image_url
    ? `/api/image-proxy?url=${encodeURIComponent(event.banner_image_url)}`
    : undefined;
  const bannerSrc = bannerDataUrl || proxyUrl;

  useEffect(() => {
    if (!bannerSrc) { setBannerLoaded(true); return; }
    setBannerLoaded(false);
    const img = new Image();
    img.onload = () => setBannerLoaded(true);
    img.onerror = () => setBannerLoaded(true);
    img.src = bannerSrc;
  }, [bannerSrc]);

  return (
    <main className="min-h-[100dvh]" style={{ backgroundColor: "var(--bg)" }}>
      <PublicShareHeader />
      <section className="mx-auto max-w-5xl px-4 py-8 flex flex-col items-center">
        <div ref={wrapperRef} className="w-full">
          <div
            className="mx-auto overflow-hidden"
            style={{
              width: 540 * cardScale,
              height: 960 * cardScale,
            }}
          >
            <div style={{ transform: `scale(${cardScale})`, transformOrigin: "top left" }}>
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
                {hasBanner && bannerSrc && (
                  <div
                    data-banner
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage: `url("${bannerSrc}")`,
                      backgroundSize: "cover",
                      backgroundPosition: event.banner_object_position || "center",
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
                        Palpites
                        <br />
                        privados
                      </p>
                      <p
                        className="mx-auto mt-4 max-w-[240px] text-[15px] font-500 uppercase tracking-widest leading-snug"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                      >
                        Os picks ficam públicos após o fechamento do evento
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
                          Palpites de
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
                            { label: "Picks", value: totalPicks, highlight: false },
                            { label: "Confirmados", value: lockedPicks, highlight: false },
                            { label: "Lutas", value: sortedFights.length, highlight: false },
                          ].map((col, i) => (
                            <div
                              key={col.label}
                              style={{
                                borderLeft: i ? "1px solid rgba(255,255,255,0.08)" : "none",
                              }}
                            >
                              <p
                                className="text-[34px] font-900 leading-none"
                                style={{ color: "#f0f0f0" }}
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
                    {/* Picks list */}
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

                        return (
                          <div
                            key={fight.id}
                            className="flex items-center justify-between gap-3"
                            style={{
                              height: 30,
                              background: "#1a1a1a",
                              borderLeft: hasPick
                                ? "3px solid #e8001a"
                                : "3px solid transparent",
                              paddingLeft: hasPick ? 9 : 12,
                              paddingRight: 10,
                            }}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className="w-[18px] text-right text-[12px] font-700"
                                style={{ color: "#555" }}
                              >
                                {index + 1}
                              </span>
                              <span
                                className="truncate text-[13px] font-700"
                                style={{
                                  color: hasPick ? "#f0f0f0" : "#555",
                                }}
                              >
                                {hasPick
                                  ? formatPickLine(pickedName, true, pick.picked_method, pick.picked_round)
                                  : "Sem pick"}
                              </span>
                            </div>
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
                        ufc-fantasy.vercel.app · faça seus picks
                      </p>
                    </div>
                  </>
                )}
              </div>
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
            bannerLoaded={bannerLoaded}
            serverImageUrl={shareImageUrl}
            bannerImageUrl={event.banner_image_url || undefined}
          />
        </div>
      )}

      <div className="mt-4 flex justify-center">
        <ShareCta />
      </div>
    </section>
  </main>
  );
}
