"use client";

import { useEffect, useState } from "react";
import { readApiResponse } from "@/lib/api";
import type { BadgeWithStatus } from "@/types";
import BadgeIcon from "@/components/badges/BadgeIcon";

const CATEGORY_COLORS: Record<string, { bg: string; border: string }> = {
  volume: { bg: "rgba(59, 130, 246, 0.15)", border: "#3b82f6" },
  accuracy: { bg: "rgba(34, 197, 94, 0.15)", border: "#22c55e" },
  streak: { bg: "rgba(245, 158, 11, 0.15)", border: "#f59e0b" },
  challenge: { bg: "rgba(232, 0, 26, 0.15)", border: "var(--red)" },
  special: { bg: "rgba(168, 85, 247, 0.15)", border: "#a855f7" },
};

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    volume: "Volume",
    accuracy: "Precisão",
    streak: "Sequência",
    challenge: "Desafios",
    special: "Especiais",
  };
  return labels[category] || category;
}

export default function BadgeGrid() {
  const [badges, setBadges] = useState<BadgeWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/badges")
      .then((res) => readApiResponse<{ badges: BadgeWithStatus[] }>(res))
      .then((data) => setBadges(data.badges))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: "1", borderRadius: 0 }} />
        ))}
      </div>
    );
  }

  const grouped = badges.reduce(
    (acc, badge) => {
      if (!acc[badge.category]) acc[badge.category] = [];
      acc[badge.category].push(badge);
      return acc;
    },
    {} as Record<string, BadgeWithStatus[]>,
  );

  const categories = Object.entries(grouped);

  if (!badges.length) {
    return (
      <div className="p-6 text-center" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Nenhuma conquista disponível no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {categories.map(([category, categoryBadges]) => {
        const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS.volume;
        const unlockedCount = categoryBadges.filter((b) => b.unlocked).length;

        return (
          <div key={category}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-condensed font-700 uppercase tracking-widest" style={{ color: colors.border }}>
                {categoryLabel(category)}
              </span>
              <span className="text-[10px] font-condensed font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                {unlockedCount}/{categoryBadges.length}
              </span>
              <span className="flex-1 h-px" style={{ backgroundColor: "var(--border)" }} />
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {categoryBadges.map((badge) => {
                const isUnlocked = badge.unlocked;
                const isExpanded = expanded === badge.id;

                return (
                  <div key={badge.id} className="relative">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : badge.id)}
                      className="w-full flex flex-col items-center gap-1.5 p-3 transition-all active:scale-95"
                      style={{
                        backgroundColor: isUnlocked ? colors.bg : "var(--bg-elevated)",
                        border: `1px solid ${isUnlocked ? colors.border : "var(--border)"}`,
                        opacity: isUnlocked ? 1 : 0.4,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ color: isUnlocked ? colors.border : "var(--text-muted)" }}>
                        <BadgeIcon iconName={badge.icon_name} size={22} />
                      </div>
                      <span
                        className="text-[10px] font-condensed font-700 uppercase tracking-widest text-center leading-tight"
                        style={{ color: isUnlocked ? "var(--text)" : "var(--text-muted)" }}
                      >
                        {badge.name}
                      </span>
                    </button>

                    {isExpanded && (
                      <div
                        className="absolute z-10 left-1/2 -translate-x-1/2 mt-1 w-56 p-3 slide-down"
                        style={{
                          backgroundColor: "var(--bg-card)",
                          border: "1px solid var(--border)",
                          borderTop: `2px solid ${colors.border}`,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                        }}
                      >
                        <p className="font-condensed font-900 text-xs uppercase tracking-widest" style={{ color: "var(--text)" }}>
                          {badge.name}
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {badge.description}
                        </p>
                        {badge.unlocked_at && (
                          <p className="text-[10px] mt-2 font-condensed font-700 uppercase tracking-widest" style={{ color: "#22c55e" }}>
                            {new Date(badge.unlocked_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
