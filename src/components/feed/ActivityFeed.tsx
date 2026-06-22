"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { ActivityFeedItem } from "@/types";
import { adminGet } from "@/components/admin/shared";

const ACTIVITY_ICONS: Record<string, string> = {
  pick_submitted: "🎯",
  result_scored: "🏆",
  challenge_created: "⚔️",
  challenge_accepted: "⚔️",
  challenge_completed: "🏁",
  league_joined: "🏟️",
  streak_milestone: "🔥",
  level_up: "⭐",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "agora";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `ha ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `ha ${days} dia${days > 1 ? "s" : ""}`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function activityText(item: ActivityFeedItem): string {
  const nick = item.profile?.nickname || "alguem";
  const m = item.metadata as any;
  switch (item.type) {
    case "pick_submitted": return `${nick} fez picks para ${m.eventName}`;
    case "result_scored": return `${nick} acertou ${m.correctWinners}/${m.totalFights} vencedores · +${m.xpEarned} XP`;
    case "challenge_created": return `${nick} desafiou ${m.challengedName}`;
    case "challenge_accepted": return `${nick} aceitou desafio de ${m.challengerName}`;
    case "challenge_completed":
      if (m.result === "win") return `${nick} venceu desafio contra ${m.opponentName}`;
      if (m.result === "loss") return `${nick} perdeu desafio para ${m.opponentName}`;
      return `${nick} empatou com ${m.opponentName}`;
    case "league_joined": return `${nick} entrou na liga ${m.groupName}`;
    case "streak_milestone": return `${nick} atingiu ${m.currentStreak} eventos seguidos!`;
    case "level_up": return `${nick} subiu para ${m.levelTitle}!`;
    default: return "";
  }
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const [error, setError] = useState(false);

  const fetchFeed = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!reset && cursorRef.current) params.set("before", cursorRef.current);
      params.set("limit", "20");
      const data = await adminGet<{
        items: ActivityFeedItem[];
        hasMore: boolean;
        nextCursor: string | null;
      }>(`/api/activity?${params.toString()}`);
      setItems((prev) =>
        reset
          ? data.items
          : [...prev, ...data.items].filter(
              (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i,
            ),
      );
      setHasMore(data.hasMore);
      cursorRef.current = data.nextCursor;
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(true);
  }, [fetchFeed]);

  return (
    <div>
      <h3
        className="font-condensed font-700 text-xs uppercase tracking-widest mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        Atividade
      </h3>

      {loading && items.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Carregando...
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="p-4" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text)" }}>
            Siga outros jogadores para ver a atividade deles aqui.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          Erro ao carregar atividade.
        </p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 py-3"
          style={{ borderBottom: "1px solid var(--border-light)" }}
        >
          <span className="text-lg">{ACTIVITY_ICONS[item.type] || "·"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-condensed text-sm" style={{ color: "var(--text)" }}>
              {activityText(item)}
            </p>
            <p className="font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
              {relativeTime(item.created_at)}
            </p>
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => { if (loading) return; fetchFeed(); }}
            disabled={loading}
            className="font-condensed text-xs uppercase tracking-widest px-6 py-2"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text)",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  );
}
