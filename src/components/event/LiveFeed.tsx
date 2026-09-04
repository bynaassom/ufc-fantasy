"use client";

import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { getMethodLabel } from "@/lib/utils";
import MotionProvider from "@/components/ui/MotionProvider";

interface LiveFighter {
  id: string;
  name: string;
  headshot_url?: string;
}

interface LiveFight {
  id: string;
  fight_order: number;
  fighter_a: LiveFighter;
  fighter_b: LiveFighter;
  winner_id?: string;
  result_method?: string;
  result_round?: number;
}

interface LivePick {
  fight_id: string;
  winner_id?: string;
  method?: string;
  round?: number;
  points_winner?: number;
  points_method?: number;
  points_round?: number;
}

interface LiveLeaderboardEntry {
  user_id: string;
  total_points: number;
  perfect_picks: number;
  fights_scored: number;
  rank_position: number;
  is_me?: boolean;
  profile?: {
    id: string;
    nickname: string;
    first_name: string;
    last_name: string;
  };
}

type OfficialFightPhase =
  | "upcoming"
  | "walkouts"
  | "introductions"
  | "live"
  | "between_rounds"
  | "awaiting_result"
  | "completed"
  | "unknown";

interface OfficialLiveFight {
  fightId: string;
  localFightId: string | null;
  fightOrder: number;
  phase: OfficialFightPhase;
  currentRound: number | null;
  roundTime: string | null;
  fighterA: { id: string; name: string };
  fighterB: { id: string; name: string };
}

interface OfficialLiveState {
  eventId: string;
  status: "upcoming" | "live" | "completed";
  fetchedAt: string;
  completedCount: number;
  totalCount: number;
  currentFight: OfficialLiveFight | null;
  nextFight: OfficialLiveFight | null;
}

interface LiveData {
  status: "upcoming" | "live" | "completed";
  fights: LiveFight[];
  picks: LivePick[];
  leaderboard?: LiveLeaderboardEntry[];
  myScore?: {
    total_points: number;
    perfect_picks: number;
    fights_scored: number;
    rank_position: number;
  } | null;
  officialLiveState?: OfficialLiveState | null;
}

interface FeedEntry {
  id: string;
  fight: LiveFight;
  pick: LivePick | undefined;
  totalPoints: number;
  seenAt: number;
}

function getPickForFight(fightId: string, picks: LivePick[]): LivePick | undefined {
  return picks.find((p) => p.fight_id === fightId);
}

function calcTotalPoints(pick: LivePick | undefined): number {
  if (!pick) return 0;
  return (pick.points_winner || 0) + (pick.points_method || 0) + (pick.points_round || 0);
}

function getFightPhaseLabel(fight: OfficialLiveFight) {
  if (fight.phase === "walkouts") return "Entradas dos lutadores";
  if (fight.phase === "introductions") return "Apresentação no octógono";
  if (fight.phase === "live") {
    return fight.currentRound ? `Round ${fight.currentRound} em andamento` : "Em andamento";
  }
  if (fight.phase === "between_rounds") {
    return fight.currentRound ? `Intervalo após o round ${fight.currentRound}` : "Intervalo";
  }
  if (fight.phase === "awaiting_result") return "Resultado em apuração";
  if (fight.phase === "completed") return "Encerrada";
  return "A seguir";
}

const LIVE_POLL_INTERVAL_MS = 20_000;
const UPCOMING_POLL_INTERVAL_MS = 60_000;
const FAR_FUTURE_POLL_INTERVAL_MS = 5 * 60_000;
const LIVE_WINDOW_MS = 6 * 60 * 60_000;

type LiveFeedProps = {
  eventSlug: string;
  initialStatus: "upcoming" | "live" | "completed";
  eventStartsAt: string;
};

function getPollInterval(status: string, eventStartsAt: string) {
  if (status === "live") return LIVE_POLL_INTERVAL_MS;
  if (status === "upcoming") {
    const timeUntilStart = new Date(eventStartsAt).getTime() - Date.now();
    return timeUntilStart > LIVE_WINDOW_MS
      ? FAR_FUTURE_POLL_INTERVAL_MS
      : UPCOMING_POLL_INTERVAL_MS;
  }
  return LIVE_POLL_INTERVAL_MS;
}

export default function LiveFeed({
  eventSlug,
  initialStatus,
  eventStartsAt,
}: LiveFeedProps) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [error, setError] = useState(false);
  const seenIds = useRef(new Set<string>());
  const [status, setStatus] = useState(initialStatus === "live" ? "live" : "");
  const [leaderboard, setLeaderboard] = useState<LiveLeaderboardEntry[]>([]);
  const [myScore, setMyScore] = useState<LiveData["myScore"]>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [officialState, setOfficialState] = useState<OfficialLiveState | null>(null);
  const [rankDelta, setRankDelta] = useState(0);
  const [pointsDelta, setPointsDelta] = useState(0);
  const previousScoreRef = useRef<LiveData["myScore"]>(null);
  const didAutoOpenRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let polling = false;
    let shouldContinue = initialStatus !== "completed";
    let lastKnownStatus = initialStatus;
    let pollAfterCurrent = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | null = null;

    function scheduleNextPoll(delay: number) {
      if (!mounted || !shouldContinue || document.hidden) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => void poll(), delay);
    }

    async function poll() {
      if (!mounted || polling || document.hidden) return;
      polling = true;
      controller = new AbortController();

      try {
        const res = await fetch(`/api/events/${eventSlug}/live`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        const data: LiveData = json.data;
        if (!mounted) return;
        setError(false);
        setLastUpdatedAt(new Date());

        const effectiveStatus = data.officialLiveState?.status || data.status;
        shouldContinue = effectiveStatus !== "completed";
        lastKnownStatus = effectiveStatus;
        setStatus(effectiveStatus);
        setOfficialState(data.officialLiveState || null);
        if (data.leaderboard) setLeaderboard(data.leaderboard);
        if (data.myScore !== undefined) {
          const previous = previousScoreRef.current;
          if (previous && data.myScore) {
            setRankDelta(previous.rank_position - data.myScore.rank_position);
            setPointsDelta(data.myScore.total_points - previous.total_points);
          }
          setMyScore(data.myScore);
          previousScoreRef.current = data.myScore;
        }

        if (effectiveStatus === "live" || effectiveStatus === "completed") {
          const newEntries: FeedEntry[] = [];
          for (const fight of data.fights) {
            if (!seenIds.current.has(fight.id)) {
              seenIds.current.add(fight.id);
              const pick = getPickForFight(fight.id, data.picks);
              newEntries.push({
                id: fight.id,
                fight,
                pick,
                totalPoints: calcTotalPoints(pick),
                seenAt: Date.now(),
              });
            }
          }
          if (newEntries.length > 0) {
            setEntries((prev) => [...newEntries.reverse(), ...prev]);
          }
        }
      } catch (pollError) {
        if (
          mounted &&
          !(pollError instanceof DOMException && pollError.name === "AbortError")
        ) {
          setError(true);
        }
      } finally {
        polling = false;
        controller = null;
      }

      if (mounted && shouldContinue) {
        const nextDelay = pollAfterCurrent
          ? 0
          : getPollInterval(lastKnownStatus, eventStartsAt);
        pollAfterCurrent = false;
        scheduleNextPoll(nextDelay);
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = undefined;
        controller?.abort();
        return;
      }

      if (!shouldContinue) return;
      if (polling) {
        pollAfterCurrent = true;
      } else {
        void poll();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const initialPollInterval = getPollInterval(initialStatus, eventStartsAt);
    if (
      initialStatus === "upcoming" &&
      retryNonce === 0 &&
      initialPollInterval === FAR_FUTURE_POLL_INTERVAL_MS
    ) {
      scheduleNextPoll(initialPollInterval);
    } else {
      void poll();
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      controller?.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [eventSlug, eventStartsAt, initialStatus, retryNonce]);

  useEffect(() => {
    if (status === "live" && !didAutoOpenRef.current) {
      didAutoOpenRef.current = true;
      setOpen(true);
    }
  }, [status]);

  if (status !== "live" && entries.length === 0 && !error) return null;

  return (
    <MotionProvider>
      <div
        className="sticky top-0 md:top-14 z-30"
        style={{
          borderBottom: open ? "1px solid var(--border)" : "none",
        }}
      >
      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 text-sm" style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
          <span style={{ color: "var(--red)" }}>Erro ao carregar dados ao vivo</span>
          <button
            type="button"
            onClick={() => setRetryNonce((value) => value + 1)}
            className="ml-2 underline text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-4 py-2 text-sm font-bold"
        style={{
          backgroundColor: open ? "var(--bg-card)" : "var(--red)",
          color: open ? "var(--text)" : "white",
        }}
      >
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: open ? "var(--red)" : "white" }}
        />
        {status === "completed" ? "EVENTO ENCERRADO" : "AO VIVO"}
        <span className="text-xs opacity-70 ml-1">
          {officialState
            ? `${officialState.completedCount}/${officialState.totalCount} lutas`
            : `${entries.length} resultado(s)`}
        </span>

        <m.svg
          className="ml-auto"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18 }}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </m.svg>
      </button>

      {/* Official UFC fight state */}
      {open && officialState?.currentFight && (
        <div
          className="px-4 py-4"
          aria-live="polite"
          style={{
            backgroundColor: "var(--bg-card)",
            borderBottom: "1px solid var(--border)",
            borderLeft: "3px solid var(--red)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-condensed font-900 text-xs uppercase tracking-widest" style={{ color: "var(--red)" }}>
                Luta atual
              </p>
              <p className="mt-1 truncate font-condensed font-900 text-base uppercase tracking-wide" style={{ color: "var(--text)" }}>
                {officialState.currentFight.fighterA.name}
                <span className="mx-1.5" style={{ color: "var(--text-muted)" }}>vs.</span>
                {officialState.currentFight.fighterB.name}
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {getFightPhaseLabel(officialState.currentFight)}
              </p>
            </div>
            {officialState.currentFight.localFightId && (
              <a
                href={`#fight-${officialState.currentFight.localFightId}`}
                className="min-tap flex-shrink-0 font-condensed font-800 text-xs uppercase tracking-widest"
                style={{ color: "var(--red)" }}
              >
                Ver card
              </a>
            )}
          </div>
          {officialState.nextFight && (
            <div className="mt-3 flex items-center gap-2 pt-3 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
              <span className="font-condensed font-800 uppercase tracking-widest">A seguir</span>
              <span className="truncate">
                {officialState.nextFight.fighterA.name} vs. {officialState.nextFight.fighterB.name}
              </span>
            </div>
          )}
        </div>
      )}

      {open && status === "live" && !officialState?.currentFight && officialState?.nextFight && (
        <div
          className="flex items-center justify-between gap-4 px-4 py-3"
          aria-live="polite"
          style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
        >
          <div className="min-w-0">
            <p className="font-condensed font-800 text-xs uppercase tracking-widest" style={{ color: "var(--red)" }}>
              Próxima luta
            </p>
            <p className="truncate text-sm" style={{ color: "var(--text)" }}>
              {officialState.nextFight.fighterA.name} vs. {officialState.nextFight.fighterB.name}
            </p>
          </div>
          <span className="flex-shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
            Aguardando início
          </span>
        </div>
      )}

      {/* My score */}
      {open && myScore && (
        <div
          className="flex flex-col items-start justify-between gap-3 px-4 py-3 text-sm sm:flex-row sm:items-center"
          style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}
        >
          <div>
            <span className="font-condensed font-700 uppercase tracking-wider" style={{ color: "var(--text)" }}>
              Meu desempenho
            </span>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {myScore.fights_scored} lutas · {myScore.perfect_picks} cravadas
            </p>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="font-condensed font-900 text-lg leading-none" style={{ color: "var(--red)" }}>
                {myScore.total_points} pts
              </p>
              <AnimatePresence initial={false}>
                {pointsDelta > 0 && (
                  <m.p
                    key={pointsDelta}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.24 }}
                    className="text-xs"
                    style={{ color: "var(--green)" }}
                  >
                    +{pointsDelta} na última atualização
                  </m.p>
                )}
              </AnimatePresence>
            </div>
            <div className="pl-3" style={{ borderLeft: "1px solid var(--border)" }}>
              <p className="font-condensed font-900 text-lg leading-none" style={{ color: "var(--text)" }}>
                #{myScore.rank_position}
              </p>
              <AnimatePresence initial={false}>
                {rankDelta !== 0 && (
                  <m.p
                    key={rankDelta}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.24 }}
                    className="text-xs"
                    style={{ color: rankDelta > 0 ? "var(--green)" : "var(--red)" }}
                  >
                    {rankDelta > 0 ? `+${rankDelta}` : rankDelta} posição{Math.abs(rankDelta) === 1 ? "" : "ões"}
                  </m.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard toggle */}
      {open && leaderboard.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowLeaderboard((v) => !v)}
            aria-expanded={showLeaderboard}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-700 uppercase tracking-widest"
            style={{ backgroundColor: "var(--bg-card)", color: "var(--text-secondary)", borderBottom: showLeaderboard ? "1px solid var(--border)" : "none" }}
          >
            Classificação ao vivo · {leaderboard.length}
            <m.svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              animate={{ rotate: showLeaderboard ? 180 : 0 }}
              transition={{ duration: 0.18 }}
            >
              <polyline points="6 9 12 15 18 9" />
            </m.svg>
          </button>
          {showLeaderboard && (
            <div style={{ backgroundColor: "var(--bg-card)" }}>
              {leaderboard.map((entry, idx) => (
                <div
                  key={entry.user_id}
                  className="flex items-center gap-3 px-4 py-2"
                  style={{
                    borderBottom: "1px solid var(--border)",
                    backgroundColor: entry.is_me ? "rgba(232,0,26,0.06)" : "transparent",
                  }}
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-condensed font-900 text-xs"
                    style={{
                      backgroundColor: entry.rank_position <= 3 ? "var(--red)" : "transparent",
                      color: entry.rank_position <= 3 ? "white" : "var(--text-muted)",
                    }}
                  >
                    {entry.rank_position || idx + 1}
                  </span>
                  {entry.profile?.nickname ? (
                    <Link
                      href={`/jogador/${encodeURIComponent(entry.profile.nickname)}`}
                      className="flex-1 truncate font-condensed font-700 text-xs uppercase tracking-wide"
                      style={{ color: entry.is_me ? "var(--red)" : "var(--text)" }}
                    >
                      {entry.profile.nickname}{entry.is_me ? " · você" : ""}
                    </Link>
                  ) : (
                    <span className="flex-1">---</span>
                  )}
                  <span className="font-condensed font-900 text-sm" style={{ color: "var(--text)" }}>
                    {entry.total_points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Feed */}
      {open && (
        <div
          className="max-h-72 overflow-y-auto px-4 py-3 space-y-3"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          {entries.length === 0 && (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Aguardando resultados...
            </p>
          )}

          {entries.map((entry) => {
            const winner =
              entry.fight.fighter_a.id === entry.fight.winner_id
                ? entry.fight.fighter_a
                : entry.fight.fighter_b;

            const isCorrect = entry.pick?.winner_id === entry.fight.winner_id;
            const methodLabel = getMethodLabel(entry.fight.result_method || "");

            return (
              <m.div
                key={entry.id}
                layout="position"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3 p-3"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Icon / Result badge */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    backgroundColor: isCorrect ? "var(--green)" : "var(--red)",
                    color: "white",
                  }}
                >
                  {isCorrect ? "✓" : "✗"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{winner.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    {methodLabel}
                    {entry.fight.result_round ? ` - R${entry.fight.result_round}` : ""}
                  </p>
                  {entry.pick && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      Seu palpite:{" "}
                      {isCorrect ? (
                        <span style={{ color: "var(--green)" }}>
                          +{entry.totalPoints} pts
                        </span>
                      ) : (
                        <span className="opacity-60">
                          {entry.pick.winner_id === entry.fight.fighter_a.id
                            ? entry.fight.fighter_a.name
                            : entry.fight.fighter_b.name}{" "}
                          · 0 pts
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Fight order */}
                <span
                  className="flex-shrink-0 text-xs font-mono"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Luta #{entry.fight.fight_order}
                </span>
              </m.div>
            );
          })}

          <p
            className="text-xs text-center py-1"
            style={{ color: "var(--text-secondary)" }}
          >
            {lastUpdatedAt
              ? `Atualizado às ${lastUpdatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · a cada 20s`
              : "Atualizando a cada 20s"}
          </p>
        </div>
      )}
      </div>
    </MotionProvider>
  );
}
