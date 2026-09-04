"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FightWithFighters, Pick, FightMethod, EventWithFights } from "@/types";
import FightCard from "./FightCard";
import { readApiResponse } from "@/lib/api";
import {
  getFightCardUnavailablePicksLabel,
  isPicksLocked,
} from "@/lib/utils";
import {
  FightCardsSkeleton,
  SkeletonBlock,
} from "@/components/ui/LoadingSkeleton";

interface EventPicksClientProps {
  event: EventWithFights;
  existingPicks: Pick[];
  eventSlug: string;
  picksOpen: boolean;
}

type PendingPick = {
  winnerId: string;
  method: FightMethod;
  round: number;
  selectedAt?: string;
};

type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

function isSamePick(a: PendingPick | undefined, b: PendingPick) {
  return (
    a?.winnerId === b.winnerId &&
    a.method === b.method &&
    a.round === b.round &&
    a.selectedAt === b.selectedAt
  );
}

function buildPickMap(picks: Pick[]) {
  return Object.fromEntries(picks.map((pick) => [pick.fight_id, pick])) as Record<
    string,
    Pick | undefined
  >;
}

function isPendingPick(value: unknown): value is PendingPick {
  if (!value || typeof value !== "object") return false;
  const pick = value as Partial<PendingPick>;
  return (
    typeof pick.winnerId === "string" &&
    ["decision", "submission", "knockout"].includes(String(pick.method)) &&
    Number.isInteger(pick.round) &&
    Number(pick.round) >= 1 &&
    Number(pick.round) <= 5 &&
    (pick.selectedAt === undefined ||
      (typeof pick.selectedAt === "string" &&
        Number.isFinite(new Date(pick.selectedAt).getTime())))
  );
}

function CardSectionHeading({
  title,
  count,
  index,
  headingId,
  primary = false,
}: {
  title: string;
  count: number;
  index: string;
  headingId: string;
  primary?: boolean;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 border-b border-[var(--border)] pb-3">
      <div className="flex min-w-0 items-end gap-3">
        <span
          aria-hidden="true"
          className={`font-condensed text-4xl font-900 leading-[0.75] ${
            primary ? "text-[var(--red)]" : "text-[var(--border)]"
          }`}
        >
          {index}
        </span>
        <div className="min-w-0">
          <p className="font-condensed text-[11px] font-800 uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Fight night
          </p>
          <h2 id={headingId} className="font-condensed text-2xl font-900 uppercase leading-none tracking-[-0.02em] text-[var(--text)] sm:text-3xl">
            {title}
          </h2>
        </div>
      </div>
      <span className="shrink-0 pb-0.5 font-condensed text-[11px] font-800 uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {count} {count === 1 ? "luta" : "lutas"}
      </span>
    </div>
  );
}

export default function EventPicksClient({
  event,
  existingPicks,
  eventSlug,
  picksOpen,
}: EventPicksClientProps) {
  const [pendingPicks, setPendingPicks] = useState<Record<string, PendingPick>>(
    {},
  );
  const [confirmedPicksMap, setConfirmedPicksMap] = useState<
    Record<string, Pick | undefined>
  >(() => buildPickMap(existingPicks));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(
    existingPicks.length > 0 ? "saved" : "idle",
  );
  const [draftsLoaded, setDraftsLoaded] = useState(false);
  const [online, setOnline] = useState(true);
  const pendingPicksRef = useRef<Record<string, PendingPick>>({});
  const draftStorageKey = `ufc-fantasy:pending-picks:${event.id}`;

  const locked = isPicksLocked(event.picks_lock_at) || !picksOpen;
  const unavailablePicksLabel = getFightCardUnavailablePicksLabel({ picksOpen });

  const { mainCard, prelimCard } = useMemo(() => {
    const fights = [...event.fights].sort((a, b) => {
      if (a.card_type !== b.card_type) {
        return a.card_type === "main" ? -1 : 1;
      }
      return a.fight_order - b.fight_order;
    });

    const nextMainCard: FightWithFighters[] = [];
    const nextPrelimCard: FightWithFighters[] = [];

    fights.forEach((fight) => {
      if (fight.card_type === "main") {
        nextMainCard.push(fight as FightWithFighters);
      } else {
        nextPrelimCard.push(fight as FightWithFighters);
      }
    });

    return {
      mainCard: nextMainCard,
      prelimCard: nextPrelimCard,
    };
  }, [event.fights]);

  const pendingPickEntries = Object.entries(pendingPicks);
  const pendingCount = pendingPickEntries.length;

  const persistDrafts = useCallback(
    (drafts: Record<string, PendingPick>) => {
      if (Object.keys(drafts).length === 0) {
        window.localStorage.removeItem(draftStorageKey);
      } else {
        window.localStorage.setItem(draftStorageKey, JSON.stringify(drafts));
      }
    },
    [draftStorageKey],
  );

  useEffect(() => {
    setOnline(navigator.onLine);
    const validFightIds = new Set(event.fights.map((fight) => fight.id));
    let restored: Record<string, PendingPick> = {};

    if (!locked) {
      try {
        const raw = window.localStorage.getItem(draftStorageKey);
        const parsed = raw ? JSON.parse(raw) : {};
        restored = Object.entries(parsed).reduce<Record<string, PendingPick>>(
          (drafts, [fightId, value]) => {
            if (validFightIds.has(fightId) && isPendingPick(value)) {
              drafts[fightId] = value;
            }
            return drafts;
          },
          {},
        );
      } catch {
        window.localStorage.removeItem(draftStorageKey);
      }
    }

    pendingPicksRef.current = restored;
    setPendingPicks(restored);
    if (Object.keys(restored).length > 0) setSaveStatus("pending");
    setDraftsLoaded(true);

    function handleOnline() {
      setOnline(true);
      if (Object.keys(pendingPicksRef.current).length > 0) {
        setSaveStatus("pending");
      }
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [draftStorageKey, event.fights, locked]);

  function handlePickChange(
    fightId: string,
    winnerId: string,
    method: FightMethod,
    round: number,
  ) {
    setPendingPicks((prev) => {
      const next = {
        ...prev,
        [fightId]: { winnerId, method, round, selectedAt: new Date().toISOString() },
      };
      pendingPicksRef.current = next;
      persistDrafts(next);
      return next;
    });
    setSaveStatus("pending");
  }

  const totalFights = event.fights.length;
  const pickedFights = new Set([
    ...Object.keys(confirmedPicksMap),
    ...Object.keys(pendingPicks),
  ]).size;

  const savePendingPicks = useCallback(async (snapshot: Record<string, PendingPick>) => {
    const snapshotEntries = Object.entries(snapshot);
    if (locked || snapshotEntries.length === 0 || !navigator.onLine) return;

    setSaveStatus("saving");
    try {
      const upserts = snapshotEntries.map(([fightId, pick]) => ({
        fightId,
        winnerId: pick.winnerId,
        method: pick.method,
        round: pick.round,
        selectedAt: pick.selectedAt,
      }));

      const clientSavedAt = new Date().toISOString();
      const clientRequestId = crypto.randomUUID();
      const saveResult = await readApiResponse<{
        savedCount: number;
        requestId: string;
        savedAt: string;
      }>(
        await fetch(`/api/events/${eventSlug}/picks`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            picks: upserts,
            clientRequestId,
            clientSavedAt,
          }),
        }),
      );

      setConfirmedPicksMap((current) => {
        const next = { ...current };

        snapshotEntries.forEach(([fightId, pick]) => {
          const currentPick = next[fightId];
          next[fightId] = {
            id: currentPick?.id || fightId,
            user_id: currentPick?.user_id || "",
            fight_id: fightId,
            event_id: event.id,
            picked_winner_id: pick.winnerId,
            picked_method: pick.method,
            picked_round: pick.round,
            is_confirmed: true,
            confirmed_at: saveResult.savedAt,
            points_winner: currentPick?.points_winner || 0,
            points_method: currentPick?.points_method || 0,
            points_round: currentPick?.points_round || 0,
            total_points: currentPick?.total_points || 0,
            created_at: currentPick?.created_at || saveResult.savedAt,
            updated_at: saveResult.savedAt,
          };
        });

        return next;
      });

      const latest = pendingPicksRef.current;
      const remaining = { ...latest };
      snapshotEntries.forEach(([fightId, savedPick]) => {
        if (isSamePick(latest[fightId], savedPick)) {
          delete remaining[fightId];
        }
      });
      pendingPicksRef.current = remaining;
      persistDrafts(remaining);
      setPendingPicks(remaining);
      setSaveStatus(Object.keys(remaining).length > 0 ? "pending" : "saved");
      if (Object.keys(remaining).length === 0) {
        window.dispatchEvent(new CustomEvent("ufc-fantasy:picks-saved"));
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  }, [event.id, eventSlug, locked, persistDrafts]);

  useEffect(() => {
    if (
      locked ||
      !draftsLoaded ||
      !online ||
      pendingCount === 0 ||
      saveStatus !== "pending"
    ) return;

    const timeoutId = window.setTimeout(() => {
      void savePendingPicks(pendingPicksRef.current);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [draftsLoaded, locked, online, pendingCount, savePendingPicks, saveStatus]);

  const picksForCards = useMemo(() => {
    const next = { ...confirmedPicksMap };
    Object.entries(pendingPicks).forEach(([fightId, pick]) => {
      const confirmed = next[fightId];
      next[fightId] = {
        id: confirmed?.id || `draft-${fightId}`,
        user_id: confirmed?.user_id || "",
        fight_id: fightId,
        event_id: event.id,
        picked_winner_id: pick.winnerId,
        picked_method: pick.method,
        picked_round: pick.round,
        is_confirmed: false,
        confirmed_at: undefined,
        points_winner: confirmed?.points_winner || 0,
        points_method: confirmed?.points_method || 0,
        points_round: confirmed?.points_round || 0,
        total_points: confirmed?.total_points || 0,
        created_at: confirmed?.created_at || new Date(0).toISOString(),
        updated_at: confirmed?.updated_at || new Date(0).toISOString(),
      };
    });
    return next;
  }, [confirmedPicksMap, event.id, pendingPicks]);

  if (!draftsLoaded) {
    return (
      <div role="status" aria-label="Carregando seus picks">
        <span className="sr-only">Carregando seus picks…</span>
        <div
          className="mb-6 flex items-center justify-between gap-4 border p-4"
          style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
          aria-hidden="true"
        >
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-32" />
            <SkeletonBlock className="h-1.5 w-48 max-w-full" />
          </div>
          <SkeletonBlock className="h-3 w-24" />
        </div>
        <FightCardsSkeleton rows={Math.max(1, event.fights.length)} />
      </div>
    );
  }

  return (
    <div>
      {/* Progress indicator */}
      {!locked && (
        <aside className="event-picks-scorebug mb-8 border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <p className="font-condensed text-[11px] font-900 uppercase tracking-[0.2em] text-[var(--red-text)]">
                Seu card
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <strong className="font-condensed text-4xl font-900 leading-none tabular-nums text-[var(--text)]">
                  {pickedFights}
                </strong>
                <span className="font-condensed text-xl font-700 text-[var(--text-muted)]">
                  / {totalFights}
                </span>
                <span className="font-condensed text-xs font-800 uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  picks completos
                </span>
              </div>
            </div>
          <div
            className="flex min-h-11 items-center gap-2 font-condensed text-xs font-800 uppercase tracking-[0.1em]"
            aria-live="polite"
            role={saveStatus === "error" ? "alert" : "status"}
            style={{
              color:
                saveStatus === "error"
                  ? "var(--red)"
                  : saveStatus === "saved"
                    ? "var(--green)"
                    : "var(--text-muted)",
            }}
          >
            {saveStatus === "saving" && (
              <span
                className="h-3 w-3 animate-spin rounded-full"
                style={{
                  border: "2px solid var(--border)",
                  borderTopColor: "var(--red)",
                }}
                aria-hidden="true"
              />
            )}
            {saveStatus === "saved" && (
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            <span>
              {saveStatus === "pending" &&
                (online ? "Preparando para salvar…" : "Salvo neste aparelho")}
              {saveStatus === "saving" && "Salvando…"}
              {saveStatus === "saved" && "Tudo salvo"}
              {saveStatus === "idle" && "Salvamento automático"}
              {saveStatus === "error" && "Erro ao salvar"}
            </span>
            {saveStatus === "error" && (
              <button
                type="button"
                onClick={() => setSaveStatus("pending")}
                className="min-tap underline underline-offset-2"
              >
                Tentar novamente
              </button>
            )}
          </div>
          </div>
          <div className="h-1.5 overflow-hidden bg-[var(--border)]">
            <div
              className="h-full bg-[var(--red)] transition-[width] duration-500"
              style={{
                width: `${totalFights > 0 ? (pickedFights / totalFights) * 100 : 0}%`,
              }}
            />
          </div>
        </aside>
      )}

      {/* Main Card */}
      {mainCard.length > 0 && (
        <section className="mb-12" aria-labelledby="main-card-heading">
          <CardSectionHeading title="Card principal" count={mainCard.length} index="01" headingId="main-card-heading" primary />
          <div className="space-y-5">
            {mainCard.map((fight) => (
              <div key={fight.id} id={`fight-${fight.id}`} className="scroll-mt-20">
                <FightCard
                  fight={fight}
                  existingPick={picksForCards[fight.id]}
                  locked={locked}
                  unavailablePicksLabel={unavailablePicksLabel}
                  onPickChange={handlePickChange}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Prelim Card */}
      {prelimCard.length > 0 && (
        <section className="mb-12" aria-labelledby="prelim-card-heading">
          <CardSectionHeading title="Card preliminar" count={prelimCard.length} index="02" headingId="prelim-card-heading" />
          <div className="space-y-5">
            {prelimCard.map((fight) => (
              <div key={fight.id} id={`fight-${fight.id}`} className="scroll-mt-20">
                <FightCard
                  fight={fight}
                  existingPick={picksForCards[fight.id]}
                  locked={locked}
                  unavailablePicksLabel={unavailablePicksLabel}
                  onPickChange={handlePickChange}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Locked / not open message */}
      {locked && !picksOpen && (
        <div
          className="mt-6 p-5 text-center"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--red)",
          }}
        >
          <svg
            className="mx-auto mb-3"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: "var(--red)" }}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <p className="font-bold" style={{ color: "var(--text)" }}>
            Picks ainda não abertos
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Os picks para este evento ainda não estão disponíveis. Fique de
            olho!
          </p>
        </div>
      )}
      {locked && picksOpen && (
        <div
          className="mt-6 p-5 text-center"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <svg
            className="mx-auto mb-3"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="font-bold" style={{ color: "var(--text)" }}>
            Picks encerrados
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            O prazo para picks expirou. Acompanhe o evento ao vivo!
          </p>
        </div>
      )}
    </div>
  );
}
