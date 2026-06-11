"use client";

import { useEffect, useRef, useState } from "react";
import { getMethodLabel } from "@/lib/utils";

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

interface LiveData {
  status: string;
  fights: LiveFight[];
  picks: LivePick[];
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

const METHOD_EMOJI: Record<string, string> = {
  knockout: "💥",
  submission: "🔒",
  decision: "⚖️",
};

export default function LiveFeed({ eventSlug }: { eventSlug: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [error, setError] = useState(false);
  const seenIds = useRef(new Set<string>());
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const res = await fetch(`/api/events/${eventSlug}/live`);
        if (!res.ok) throw new Error("fetch failed");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        const data: LiveData = json.data;

        setStatus(data.status);

        if (data.status !== "live") return;

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
      } catch {
        setError(true);
      }

      if (mounted) {
        timeoutId = setTimeout(poll, 20000);
      }
    }

    poll();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [eventSlug]);

  if (status !== "live" && entries.length === 0) return null;

  return (
    <div
      className="sticky top-16 z-30"
      style={{
        borderBottom: open ? "1px solid var(--border)" : "none",
      }}
    >
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(!open)}
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
        AO VIVO
        <span className="text-xs opacity-70 ml-1">{entries.length} resultado(s)</span>

        <svg
          className="ml-auto transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Feed */}
      {open && (
        <div
          className="max-h-80 overflow-y-auto px-4 py-3 space-y-3"
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
            const loser =
              entry.fight.fighter_a.id === entry.fight.winner_id
                ? entry.fight.fighter_b
                : entry.fight.fighter_a;

            const isCorrect = entry.pick?.winner_id === entry.fight.winner_id;
            const methodLabel = getMethodLabel(entry.fight.result_method || "");

            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 animate-in fade-in slide-in-from-top-2 duration-300"
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
                    {METHOD_EMOJI[entry.fight.result_method || ""] || ""}{" "}
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
              </div>
            );
          })}

          <p
            className="text-xs text-center py-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Atualizando a cada 20s
          </p>
        </div>
      )}
    </div>
  );
}
