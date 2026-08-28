import EventRankingSelector from "@/components/ranking/EventRankingSelector";
import EventBonusLabel from "@/components/event/EventBonusLabel";
import AnimatedRankingTable from "@/components/ranking/AnimatedRankingTable";
import Pagination from "@/components/ui/Pagination";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
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
  previousRank: number | null;
  movement: number;
};

export const dynamic = "force-dynamic";

export default async function RankingPage(
  props: {
    searchParams: Promise<{ tab?: string; event?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
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
    movementEvent,
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
              {selectedEvent.is_bonus && <div className="mt-2"><EventBonusLabel /></div>}
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {selectedEvent.is_bonus
                  ? "Ranking exclusivo do evento; estes pontos não entram nos rankings acumulados."
                  : "Resultado do ranking por evento."}
              </p>
            </div>
            <EventRankingSelector
              events={eventOptions}
              selectedSlug={selectedEvent.slug}
            />
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
              {currentMyRank.movement !== 0 && (
                <p
                  className="font-condensed font-900 text-xs uppercase tracking-wider"
                  style={{
                    color:
                      currentMyRank.movement > 0
                        ? "var(--green)"
                        : "var(--text-muted)",
                  }}
                >
                  {currentMyRank.movement > 0 ? "▲" : "▼"}{" "}
                  {Math.abs(currentMyRank.movement)}
                </p>
              )}
            </div>
          </div>
        )}

        {movementEvent && tab !== "evento" && (
          <div
            className="mb-4 flex items-start gap-3 px-4 py-3"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="mt-0.5 text-sm" style={{ color: "var(--red)" }} aria-hidden="true">
              ↕
            </span>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Mudanças de posição após <strong style={{ color: "var(--text)" }}>{movementEvent.name}</strong>.
            </p>
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
            <AnimatedRankingTable
              rows={paginatedRanking}
              currentUserId={profile.id}
              tab={tab}
              animationKey={`${tab}:${movementEvent?.id || selectedEvent?.id || "current"}:${currentPage}`}
            />
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
