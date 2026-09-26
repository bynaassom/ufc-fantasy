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
  const playerAhead = currentMyRank
    ? ranking.find((entry) => entry.rank === currentMyRank.rank - 1)
    : undefined;
  const pointsGap = playerAhead && currentMyRank
    ? Math.max(0, playerAhead.points - currentMyRank.points)
    : null;

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
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/home" className="inline-flex items-center gap-1 mb-4" style={{ color: "var(--text-muted)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-xs font-condensed font-700 uppercase tracking-wider">Início</span>
        </Link>
        {/* Header */}
        <div className="mb-6 border-b-2 pb-4" style={{ borderColor: "var(--red)" }}>
          <p className="font-condensed font-700 text-xs uppercase tracking-[0.24em]" style={{ color: "var(--text-muted)" }}>
            UFC FANTASY / CLASSIFICAÇÃO
          </p>
          <h1 className="font-condensed font-900 uppercase leading-none tracking-tight" style={{ color: "var(--text)", fontSize: "clamp(2rem, 6vw, 3.25rem)" }}>
            Ranking <span style={{ color: "var(--red)" }}>Fantasy</span>
          </h1>
        </div>

        {/* Modos de classificação */}
        <nav
          className="grid grid-cols-3 mb-6"
          aria-label="Modo do ranking"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Link
            href="/ranking?tab=geral"
            aria-current={tab === "geral" ? "page" : undefined}
            className="flex-1 min-h-12 border-b-4 py-3 text-center font-condensed font-900 text-xs uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              backgroundColor: tab === "geral" ? "rgba(232,0,26,0.08)" : "transparent",
              color: tab === "geral" ? "var(--text)" : "var(--text-muted)",
              borderColor: tab === "geral" ? "var(--red)" : "transparent",
            }}
          >
            GERAL
          </Link>
          <Link
            href="/ranking?tab=temporada"
            aria-current={tab === "temporada" ? "page" : undefined}
            className="flex-1 min-h-12 border-b-4 py-3 text-center font-condensed font-900 text-xs uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              backgroundColor: tab === "temporada" ? "rgba(232,0,26,0.08)" : "transparent",
              color: tab === "temporada" ? "var(--text)" : "var(--text-muted)",
              borderColor: tab === "temporada" ? "var(--red)" : "transparent",
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
            aria-current={tab === "evento" ? "page" : undefined}
            className="flex-1 min-h-12 border-b-4 py-3 text-center font-condensed font-900 text-xs uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              backgroundColor: tab === "evento" ? "rgba(232,0,26,0.08)" : "transparent",
              color: tab === "evento" ? "var(--text)" : "var(--text-muted)",
              borderColor: tab === "evento" ? "var(--red)" : "transparent",
            }}
          >
            EVENTO
          </Link>
        </nav>

        {tab === "evento" && eventOptions.length > 0 && selectedEvent && (
          <div
            className="mb-5 flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderLeft: "4px solid var(--red)",
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
              borderLeft: "4px solid var(--red)",
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
            className="mb-5 flex items-center gap-4 border-y-2 px-5 py-4"
            style={{
              backgroundColor: "rgba(232,0,26,0.06)",
              borderColor: "var(--red)",
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
              {pointsGap !== null && (
                <p className="mt-1 font-condensed font-700 text-xs uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  {pointsGap === 0 ? "Mesma pontuação da posição acima" : `A ${pointsGap} ${pointsGap === 1 ? "ponto" : "pontos"} do próximo lugar`}
                </p>
              )}
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
