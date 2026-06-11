"use client";

import { useMemo, useState } from "react";
import { FightWithFighters, Pick, FightMethod, EventWithFights } from "@/types";
import FightCard from "./FightCard";
import { readApiResponse } from "@/lib/api";
import {
  getFightCardUnavailablePicksLabel,
  isPicksLocked,
} from "@/lib/utils";
import toast from "react-hot-toast";

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
};

function buildPickMap(picks: Pick[]) {
  return Object.fromEntries(picks.map((pick) => [pick.fight_id, pick])) as Record<
    string,
    Pick | undefined
  >;
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
  const [saving, setSaving] = useState(false);

  const locked = isPicksLocked(event.picks_lock_at) || !picksOpen;
  const unavailablePicksLabel = getFightCardUnavailablePicksLabel({ picksOpen });

  const { mainCard, prelimCard, fightById } = useMemo(() => {
    const fights = [...event.fights].sort((a, b) => {
      if (a.card_type !== b.card_type) {
        return a.card_type === "main" ? -1 : 1;
      }
      return a.fight_order - b.fight_order;
    });

    const nextFightById = new Map<string, FightWithFighters>();
    const nextMainCard: FightWithFighters[] = [];
    const nextPrelimCard: FightWithFighters[] = [];

    fights.forEach((fight) => {
      nextFightById.set(fight.id, fight as FightWithFighters);
      if (fight.card_type === "main") {
        nextMainCard.push(fight as FightWithFighters);
      } else {
        nextPrelimCard.push(fight as FightWithFighters);
      }
    });

    return {
      mainCard: nextMainCard,
      prelimCard: nextPrelimCard,
      fightById: nextFightById,
    };
  }, [event.fights]);

  const pendingPickEntries = Object.entries(pendingPicks);

  function handlePickChange(
    fightId: string,
    winnerId: string,
    method: FightMethod,
    round: number,
  ) {
    setPendingPicks((prev) => ({
      ...prev,
      [fightId]: { winnerId, method, round },
    }));
  }

  const totalFights = event.fights.length;
  const pickedFights = new Set([
    ...Object.keys(confirmedPicksMap),
    ...Object.keys(pendingPicks),
  ]).size;

  async function handleConfirm() {
    if (locked) return;
    if (pendingPickEntries.length === 0) {
      toast.error("Nenhum pick novo para salvar.");
      return;
    }

    // Valida que picks de KO/finalização têm round selecionado
    for (const [fightId, pick] of pendingPickEntries) {
      if (pick.method !== "decision" && (!pick.round || pick.round < 1)) {
        const fight = fightById.get(fightId);
        const name = fight
          ? `${fight.fighter_a.name} vs ${fight.fighter_b.name}`
          : "uma luta";
        toast.error(`Selecione o round para: ${name}`);
        return;
      }
    }

    setSaving(true);

    try {
      const upserts = pendingPickEntries.map(([fightId, pick]) => ({
        fightId,
        winnerId: pick.winnerId,
        method: pick.method,
        round: pick.round,
      }));

      await readApiResponse<{ savedCount: number }>(
        await fetch(`/api/events/${eventSlug}/picks`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ picks: upserts }),
        }),
      );

      toast.success(`✅ ${upserts.length} pick(s) confirmados!`);
      setConfirmedPicksMap((current) => {
        const next = { ...current };

        pendingPickEntries.forEach(([fightId, pick]) => {
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
            confirmed_at: new Date().toISOString(),
            points_winner: currentPick?.points_winner || 0,
            points_method: currentPick?.points_method || 0,
            points_round: currentPick?.points_round || 0,
            total_points: currentPick?.total_points || 0,
            created_at: currentPick?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        });

        return next;
      });
      setPendingPicks({});
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar picks. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      {/* Progress indicator */}
      {!locked && (
        <div
          className="mb-6 p-4 flex items-center justify-between"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
              {pickedFights}/{totalFights} lutas com pick
            </p>
            <div
              className="mt-2 h-1.5 w-48 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--border)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  backgroundColor: "var(--red)",
                  width: `${(pickedFights / totalFights) * 100}%`,
                }}
              />
            </div>
          </div>
          {pendingPickEntries.length > 0 && (
            <span
              className="text-xs font-semibold px-2 py-1"
              style={{
                backgroundColor: "rgba(239,68,68,0.1)",
                color: "var(--red)",
              }}
            >
              {pendingPickEntries.length} não salvo(s)
            </span>
          )}
        </div>
      )}

      {/* Main Card */}
      {mainCard.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-px flex-1"
              style={{ backgroundColor: "var(--border)" }}
            />
            <h2
              className="text-sm font-black uppercase tracking-widest px-3 py-1"
              style={{ backgroundColor: "var(--red)", color: "white" }}
            >
              Card Principal
            </h2>
            <div
              className="h-px flex-1"
              style={{ backgroundColor: "var(--border)" }}
            />
          </div>
          <div className="space-y-4">
            {mainCard.map((fight) => (
              <FightCard
                key={fight.id}
                fight={fight}
                existingPick={confirmedPicksMap[fight.id]}
                locked={locked}
                unavailablePicksLabel={unavailablePicksLabel}
                onPickChange={handlePickChange}
              />
            ))}
          </div>
        </section>
      )}

      {/* Prelim Card */}
      {prelimCard.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="h-px flex-1"
              style={{ backgroundColor: "var(--border)" }}
            />
            <h2
              className="text-sm font-black uppercase tracking-widest px-3 py-1"
              style={{
                backgroundColor: "var(--bg-card)",
                color: "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              Card Preliminar
            </h2>
            <div
              className="h-px flex-1"
              style={{ backgroundColor: "var(--border)" }}
            />
          </div>
          <div className="space-y-4">
            {prelimCard.map((fight) => (
              <FightCard
                key={fight.id}
                fight={fight}
                existingPick={confirmedPicksMap[fight.id]}
                locked={locked}
                unavailablePicksLabel={unavailablePicksLabel}
                onPickChange={handlePickChange}
              />
            ))}
          </div>
        </section>
      )}

      {/* Confirm button */}
      {!locked && Object.keys(pendingPicks).length > 0 && (
        <div className="sticky mt-6" style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom) + 0.75rem)" }}>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full py-4 font-black text-white text-base tracking-wide transition-all hover:opacity-90 active:scale-98 disabled:opacity-60 shadow-lg"
            style={{
              backgroundColor: "var(--red)",
              boxShadow: "0 4px 24px rgba(239,68,68,0.4)",
            }}
          >
            {saving
              ? "Salvando..."
              : `CONFIRMAR ${Object.keys(pendingPicks).length} PICK(S)`}
          </button>
        </div>
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
