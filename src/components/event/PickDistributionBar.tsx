"use client";

import type { PickDistributionItem } from "@/types";

export default function PickDistributionBar({
  dist,
}: {
  dist: PickDistributionItem;
}) {
  const totalWinners = dist.winner_picks.reduce((s, w) => s + w.count, 0);
  const totalMethods = dist.method_picks.reduce((s, m) => s + m.count, 0);

  if (totalWinners === 0 && totalMethods === 0) return null;

  return (
    <div className="mt-2 pt-2 w-full" style={{ borderTop: "1px solid var(--border)" }}>
      {totalWinners > 0 && (
        <div className="mb-2">
          <p className="font-condensed text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            Vencedor
          </p>
          {dist.winner_picks
            .sort((a, b) => b.pct - a.pct)
            .map((w) => (
              <div key={w.fighterId} className="flex items-center gap-2 mb-1">
                <span className="font-condensed text-xs w-20 truncate" style={{ color: "var(--text)" }}>
                  {w.name}
                </span>
                <div className="flex-1 h-3" style={{ backgroundColor: "var(--border)" }}>
                  <div
                    className="h-3"
                    style={{
                      width: `${w.pct}%`,
                      backgroundColor: w.pct >= 50 ? "var(--red)" : "var(--text-muted)",
                      transition: "width 0.3s",
                    }}
                  />
                </div>
                <span className="font-condensed font-700 text-xs w-10 text-right" style={{ color: "var(--text)" }}>
                  {w.pct}%
                </span>
              </div>
            ))}
        </div>
      )}

      {totalMethods > 0 && (
        <div>
          <p className="font-condensed text-xs uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
            Metodo
          </p>
          <div className="flex gap-3">
            {dist.method_picks
              .sort((a, b) => b.pct - a.pct)
              .map((m) => (
                <span key={m.method} className="font-condensed text-xs" style={{ color: "var(--text)" }}>
                  {m.method.toUpperCase()} {m.pct}%
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
