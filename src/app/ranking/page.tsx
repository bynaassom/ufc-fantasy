import EventRankingSelector from "@/components/ranking/EventRankingSelector";
import Pagination from "@/components/ui/Pagination";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { Suspense } from "react";
import { getPlayerLevel } from "@/lib/player-levels";
import type { RankingSelectableEvent } from "@/lib/ranking-events";
import { getRankingPageData } from "@/server/services/app";

const ITEMS_PER_PAGE = 20;

type RankingRow = {
  rank: number;
  nickname: string;
  first_name: string;
  last_name: string;
  points: number;
  perfect_picks: number;
  userId: string;
};

export const dynamic = "force-dynamic";

export default async function RankingPage({
  searchParams,
}: {
  searchParams: { tab?: string; event?: string; page?: string };
}) {
  const tab =
    searchParams.tab === "evento"
      ? "evento"
      : searchParams.tab === "temporada"
        ? "temporada"
      : "geral";
  const requestedPage = Math.max(1, Number(searchParams.page) || 1);
  const {
    profile,
    currentSeason,
    selectedRankingEvent,
    rankingEvents,
    displayRanking,
    myRank,
  } = await getRankingPageData(tab, searchParams.event);
  const ranking = displayRanking as RankingRow[];
  const currentMyRank = myRank as RankingRow | null;
  const eventOptions = rankingEvents as RankingSelectableEvent[];
  const selectedEvent = selectedRankingEvent as RankingSelectableEvent | null;

  const totalPages = Math.max(1, Math.ceil(ranking.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const paginatedRanking = ranking.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  function rankingPageHref(page: number) {
    const params = new URLSearchParams();
    params.set("tab", tab);
    if (tab === "evento" && selectedEvent) params.set("event", selectedEvent.slug);
    if (page > 1) params.set("page", String(page));
    return `/ranking?${params.toString()}`;
  }

  return (
    <div
      className="min-h-[100dvh] md:pb-0"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar profile={profile} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/home" className="inline-flex items-center gap-1 mb-4" style={{ color: "var(--text-muted)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-xs font-condensed font-700 uppercase tracking-wider">Início</span>
        </Link>
        {/* Header */}
        <div className="mb-6">
          <div className="red-line">
            <span className="section-title" style={{ fontSize: "1.75rem" }}>
              RANKING
            </span>
          </div>
        </div>

        {/* Toggle — estilo igual ao da imagem (Card Principal / Preliminares) */}
        <div
          className="grid grid-cols-3 mb-6"
          style={{ border: "1px solid var(--border)" }}
        >
          <Link
            href="/ranking?tab=geral"
            className="flex-1 py-3 text-center font-condensed font-900 text-xs uppercase tracking-widest transition-all"
            style={{
              backgroundColor:
                tab === "geral" ? "var(--red)" : "var(--bg-card)",
              color: tab === "geral" ? "white" : "var(--text-muted)",
              borderRight: "1px solid var(--border)",
            }}
          >
            GERAL
          </Link>
          <Link
            href="/ranking?tab=temporada"
            className="flex-1 py-3 text-center font-condensed font-900 text-xs uppercase tracking-widest transition-all"
            style={{
              backgroundColor:
                tab === "temporada" ? "var(--red)" : "var(--bg-card)",
              color: tab === "temporada" ? "white" : "var(--text-muted)",
              borderRight: "1px solid var(--border)",
            }}
          >
            TEMPORADA
          </Link>
          <Link
            href={
              selectedEvent
                ? `/ranking?tab=evento&event=${selectedEvent.slug}`
                : "/ranking?tab=evento"
            }
            className="flex-1 py-3 text-center font-condensed font-900 text-xs uppercase tracking-widest transition-all"
            style={{
              backgroundColor:
                tab === "evento" ? "var(--red)" : "var(--bg-card)",
              color: tab === "evento" ? "white" : "var(--text-muted)",
              borderRight: "1px solid var(--border)",
            }}
          >
            EVENTO
          </Link>
        </div>

        {tab === "evento" && eventOptions.length > 0 && selectedEvent && (
          <div
            className="mb-5 flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <p
                className="font-condensed font-900 text-lg uppercase tracking-wide"
                style={{ color: "var(--text)" }}
              >
                {selectedEvent.name}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Resultado do ranking por evento.
              </p>
            </div>
            <Suspense fallback={null}>
              <EventRankingSelector
                events={eventOptions}
                selectedSlug={selectedEvent.slug}
              />
            </Suspense>
          </div>
        )}

        {tab === "temporada" && currentSeason && (
          <div
            className="mb-5 p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <p
              className="font-condensed font-900 text-lg uppercase tracking-wide"
              style={{ color: "var(--text)" }}
            >
              {currentSeason.name}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Ranking da temporada atual baseado nos eventos incluídos.
            </p>
          </div>
        )}

        {/* Minha posição */}
        {currentMyRank && (
          <div
            className="mb-5 flex items-center gap-4 px-5 py-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderLeft: "3px solid var(--red)",
            }}
          >
            <span
              className="font-condensed font-900 text-3xl"
              style={{ color: "var(--red)" }}
            >
              #{currentMyRank.rank}
            </span>
            <div className="flex-1">
              <p
                className="font-condensed font-900 text-base uppercase tracking-wide"
                style={{ color: "var(--red)" }}
              >
                {currentMyRank.nickname ||
                  `${currentMyRank.first_name} ${currentMyRank.last_name}`.trim()}{" "}
                <span
                  className="text-xs font-700"
                  style={{ color: "var(--text-muted)" }}
                >
                  (você)
                </span>
              </p>
              <p
                className="font-condensed font-600 text-xs uppercase tracking-widest"
                style={{ color: "var(--text-secondary)" }}
              >
                {getPlayerLevel(currentMyRank.points).label}
              </p>
              {currentMyRank.nickname && (
                <p
                  className="font-condensed font-600 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {currentMyRank.first_name} {currentMyRank.last_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p
                className="font-condensed font-900 text-2xl"
                style={{ color: "var(--red)" }}
              >
                {currentMyRank.points}
              </p>
              <p
                className="font-condensed font-600 text-xs uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                pts
              </p>
            </div>
          </div>
        )}

        {/* Aviso se aba evento sem dados */}
        {tab === "evento" && ranking.length === 0 && (
          <div
            className="py-12 text-center"
            style={{ border: "1px solid var(--border)" }}
          >
            <p
              className="font-condensed font-700 uppercase tracking-widest text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Ainda sem resultados para este evento
            </p>
          </div>
        )}

        {tab === "temporada" && ranking.length === 0 && (
          <div
            className="py-12 text-center"
            style={{ border: "1px solid var(--border)" }}
          >
            <p
              className="font-condensed font-700 uppercase tracking-widest text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Ainda sem resultados para a temporada
            </p>
          </div>
        )}

        {/* Tabela */}
        {paginatedRanking.length > 0 && (
          <>
            <div
              className="grid grid-cols-12 px-4 py-2"
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderBottom: "2px solid var(--red)",
              }}
            >
              <div className="col-span-1">
                <span
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  #
                </span>
              </div>
              <div className="col-span-9">
                <span
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  Jogador
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span
                  className="font-condensed font-700 text-xs uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  Pts
                </span>
              </div>
            </div>

            <div
              style={{ border: "1px solid var(--border)", borderTop: "none" }}
            >
              {paginatedRanking.map((entry, index) => {
                const isMe = entry.userId === profile.id;
                const medalColors = ["var(--yellow)", "var(--text-secondary)", "var(--text-muted)"];
                return (
                  <div
                    key={entry.userId}
                    className="grid grid-cols-12 px-4 py-3.5 items-center"
                    style={{
                      backgroundColor: isMe
                        ? "rgba(232,0,26,0.04)"
                        : "transparent",
                      borderBottom:
                        index < paginatedRanking.length - 1
                          ? "1px solid var(--border-light)"
                          : "none",
                      borderLeft: "1px solid transparent",
                      outline: isMe
                        ? "1px solid var(--red)"
                        : "none",
                      outlineOffset: "-1px",
                    }}
                  >
                    <div className="col-span-1">
                      {entry.rank <= 3 ? (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={medalColors[entry.rank - 1]}
                          stroke="none"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ) : (
                        <span
                          className="font-condensed font-700 text-sm"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {entry.rank}
                        </span>
                      )}
                    </div>
                    <div className="col-span-9">
                      <Link
                        href={`/jogador/${entry.nickname}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <div
                          className="w-7 h-7 flex items-center justify-center font-condensed font-900 text-xs flex-shrink-0"
                          style={{
                            backgroundColor: isMe
                              ? "var(--red)"
                              : "var(--bg-elevated)",
                            color: isMe ? "white" : "var(--text-secondary)",
                          }}
                        >
                          {(entry.nickname ||
                            entry.first_name ||
                            "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <p
                            className="font-condensed font-900 text-sm uppercase tracking-wide leading-tight"
                            style={{ color: isMe ? "var(--red)" : "var(--text)" }}
                          >
                            {entry.nickname ||
                              `${entry.first_name} ${entry.last_name}`.trim()}
                          </p>
                          {entry.nickname && (
                            <p
                              className="font-condensed font-600 text-xs uppercase tracking-widest"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {entry.first_name} {entry.last_name}
                            </p>
                          )}
                          <p
                            className="font-condensed font-700 text-[10px] uppercase tracking-widest"
                            style={{ color: "var(--red)" }}
                          >
                            {getPlayerLevel(entry.points).label}
                          </p>
                        </div>
                      </Link>
                    </div>
                    <div className="col-span-2 text-right">
                      <span
                        className="font-condensed font-900 text-lg"
                        style={{
                          color: entry.rank <= 3 ? "var(--red)" : "var(--text)",
                        }}
                      >
                        {entry.points}
                      </span>
                      {tab === "evento" && entry.perfect_picks > 0 && (
                        <p
                          className="font-condensed font-600 text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          {entry.perfect_picks} cravada
                          {entry.perfect_picks > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {paginatedRanking.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            buildHref={rankingPageHref}
          />
        )}
      </main>
    </div>
  );
}
