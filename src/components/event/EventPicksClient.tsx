"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FightWithFighters, Pick, FightMethod, EventWithFights } from "@/types";
import FightCard from "./FightCard";
import { createClient } from "@/lib/supabase/client";
import { isPicksLocked } from "@/lib/utils";
import toast from "react-hot-toast";

interface EventPicksClientProps {
  event: EventWithFights;
  existingPicks: Pick[];
  userId: string;
}

type PendingPick = {
  winnerId: string;
  method: FightMethod;
  round: number;
};

export default function EventPicksClient({
  event,
  existingPicks,
  userId,
}: EventPicksClientProps) {
  const router = useRouter();
  const [pendingPicks, setPendingPicks] = useState<Record<string, PendingPick>>(
    {},
  );
  const [saving, setSaving] = useState(false);

  const locked = isPicksLocked(event.picks_lock_at);

  const mainCard = event.fights
    .filter((f) => f.card_type === "main")
    .sort((a, b) => a.fight_order - b.fight_order);

  const prelimCard = event.fights
    .filter((f) => f.card_type === "preliminary")
    .sort((a, b) => a.fight_order - b.fight_order);

  const existingPicksMap = Object.fromEntries(
    existingPicks.map((p) => [p.fight_id, p]),
  );

  const handlePickChange = useCallback(
    (fightId: string, winnerId: string, method: FightMethod, round: number) => {
      setPendingPicks((prev) => ({
        ...prev,
        [fightId]: { winnerId, method, round },
      }));
    },
    [],
  );

  const totalFights = event.fights.length;
  const pickedFights = new Set([
    ...Object.keys(existingPicksMap),
    ...Object.keys(pendingPicks),
  ]).size;

  async function handleConfirm() {
    if (locked) return;
    if (Object.keys(pendingPicks).length === 0) {
      toast.error("Nenhum pick novo para salvar.");
      return;
    }

    // Valida que picks de KO/finalização têm round selecionado
    for (const [fightId, pick] of Object.entries(pendingPicks)) {
      if (pick.method !== "decision" && (!pick.round || pick.round < 1)) {
        const fight = event.fights.find((f) => f.id === fightId);
        const name = fight
          ? `${fight.fighter_a.name} vs ${fight.fighter_b.name}`
          : "uma luta";
        toast.error(`Selecione o round para: ${name}`);
        return;
      }
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const upserts = Object.entries(pendingPicks).map(([fightId, pick]) => ({
        user_id: userId,
        fight_id: fightId,
        event_id: event.id,
        picked_winner_id: pick.winnerId,
        picked_method: pick.method,
        picked_round: pick.round,
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("picks")
        .upsert(upserts, { onConflict: "user_id,fight_id" });

      if (error) throw error;

      toast.success(`✅ ${upserts.length} pick(s) confirmados!`);
      setPendingPicks({});
      router.refresh();
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
          className="mb-6 p-4 rounded-xl flex items-center justify-between"
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
          {Object.keys(pendingPicks).length > 0 && (
            <span
              className="text-xs font-semibold px-2 py-1 rounded"
              style={{
                backgroundColor: "rgba(239,68,68,0.1)",
                color: "var(--red)",
              }}
            >
              {Object.keys(pendingPicks).length} não salvo(s)
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
              className="text-sm font-black uppercase tracking-widest px-3 py-1 rounded"
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
                fight={fight as FightWithFighters}
                existingPick={existingPicksMap[fight.id]}
                locked={locked}
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
              className="text-sm font-black uppercase tracking-widest px-3 py-1 rounded"
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
                fight={fight as FightWithFighters}
                existingPick={existingPicksMap[fight.id]}
                locked={locked}
                onPickChange={handlePickChange}
              />
            ))}
          </div>
        </section>
      )}

      {/* Confirm button */}
      {!locked && Object.keys(pendingPicks).length > 0 && (
        <div className="sticky bottom-20 md:bottom-6 mt-6">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full py-4 rounded-xl font-black text-white text-base tracking-wide transition-all hover:opacity-90 active:scale-98 disabled:opacity-60 shadow-lg"
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

      {/* Locked message */}
      {locked && (
        <div
          className="mt-6 p-5 rounded-xl text-center"
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
