"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getPlayerLevel } from "@/lib/player-levels";

export type AnimatedRankingRow = {
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

type Props = {
  rows: AnimatedRankingRow[];
  currentUserId: string;
  tab: "geral" | "evento" | "temporada";
  animationKey: string;
};

function MovementIndicator({ movement }: { movement: number }) {
  if (movement === 0) {
    return (
      <span className="sr-only">Posição mantida</span>
    );
  }

  const gained = movement > 0;
  const amount = Math.abs(movement);
  return (
    <span
      className="mt-0.5 inline-flex items-center gap-0.5 font-condensed text-[10px] font-900 uppercase tracking-wider"
      style={{ color: gained ? "var(--green)" : "var(--text-muted)" }}
      aria-label={`${gained ? "Subiu" : "Desceu"} ${amount} ${amount === 1 ? "posição" : "posições"}`}
    >
      <span aria-hidden="true">{gained ? "▲" : "▼"}</span>
      {amount}
    </span>
  );
}

export default function AnimatedRankingTable({
  rows,
  currentUserId,
  tab,
  animationKey,
}: Props) {
  const hasMovement = rows.some(
    (entry) => entry.previousRank !== null && entry.movement !== 0,
  );
  const previousOrder = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          (a.previousRank || a.rank) - (b.previousRank || b.rank) ||
          a.rank - b.rank,
      ),
    [rows],
  );
  const [settled, setSettled] = useState(!hasMovement);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const previousRects = useRef(new Map<string, DOMRect>());
  const displayRows = settled ? rows : previousOrder;

  useLayoutEffect(() => {
    const currentRects = new Map<string, DOMRect>();
    rowRefs.current.forEach((element, userId) => {
      currentRects.set(userId, element.getBoundingClientRect());
    });

    if (settled && previousRects.current.size > 0) {
      rowRefs.current.forEach((element, userId) => {
        const before = previousRects.current.get(userId);
        const after = currentRects.get(userId);
        if (!before || !after) return;
        const deltaY = before.top - after.top;
        if (Math.abs(deltaY) < 1) return;
        element.animate(
          [
            { transform: `translateY(${deltaY}px)` },
            { transform: "translateY(0)" },
          ],
          {
            duration: 700,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        );
      });
    }

    previousRects.current = currentRects;
  }, [displayRows, settled]);

  useEffect(() => {
    if (!hasMovement) return;
    const storageKey = `ufc-fantasy:ranking-animation:${animationKey}`;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadyAnimated = window.sessionStorage.getItem(storageKey) === "1";

    if (reduceMotion || alreadyAnimated) {
      setSettled(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setSettled(true);
      window.sessionStorage.setItem(storageKey, "1");
    }, 500);
    return () => window.clearTimeout(timer);
  }, [animationKey, hasMovement]);

  const myMovement = rows.find((entry) => entry.userId === currentUserId)?.movement || 0;

  return (
    <>
      <p className="sr-only" aria-live="polite">
        {settled && myMovement !== 0
          ? `Ranking atualizado. Você ${myMovement > 0 ? "subiu" : "desceu"} ${Math.abs(myMovement)} ${Math.abs(myMovement) === 1 ? "posição" : "posições"}.`
          : ""}
      </p>
      <div
        className="grid grid-cols-12 px-4 py-2"
        style={{
          backgroundColor: "var(--bg-elevated)",
          borderBottom: "2px solid var(--red)",
        }}
      >
        <div className="col-span-2 sm:col-span-1">
          <span className="font-condensed font-700 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            #
          </span>
        </div>
        <div className="col-span-8 sm:col-span-9">
          <span className="font-condensed font-700 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Jogador
          </span>
        </div>
        <div className="col-span-2 text-right">
          <span className="font-condensed font-700 text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            Pts
          </span>
        </div>
      </div>

      <div style={{ border: "1px solid var(--border)", borderTop: "none" }}>
        {displayRows.map((entry, index) => {
          const isMe = entry.userId === currentUserId;
          const medalColors = ["var(--yellow)", "var(--text-secondary)", "var(--text-muted)"];
          return (
            <div
              key={entry.userId}
              ref={(element) => {
                if (element) rowRefs.current.set(entry.userId, element);
                else rowRefs.current.delete(entry.userId);
              }}
              className="grid grid-cols-12 px-4 py-3.5 items-center"
              style={{
                backgroundColor: isMe ? "rgba(232,0,26,0.04)" : "transparent",
                borderBottom: index < displayRows.length - 1 ? "1px solid var(--border-light)" : "none",
                outline: isMe ? "1px solid var(--red)" : "none",
                outlineOffset: "-1px",
              }}
            >
              <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
                {entry.rank <= 3 ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={medalColors[entry.rank - 1]} aria-label={`Posição ${entry.rank}`}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ) : (
                  <span className="font-condensed font-700 text-sm" style={{ color: "var(--text-muted)" }}>
                    {entry.rank}
                  </span>
                )}
                {settled && <MovementIndicator movement={entry.movement} />}
              </div>
              <div className="col-span-8 sm:col-span-9">
                <Link href={`/jogador/${entry.nickname}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div
                    className="w-7 h-7 flex items-center justify-center font-condensed font-900 text-xs flex-shrink-0"
                    style={{
                      backgroundColor: isMe ? "var(--red)" : "var(--bg-elevated)",
                      color: isMe ? "white" : "var(--text-secondary)",
                    }}
                    aria-hidden="true"
                  >
                    {(entry.nickname || entry.first_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-condensed font-900 text-sm uppercase tracking-wide leading-tight truncate" style={{ color: isMe ? "var(--red)" : "var(--text)" }}>
                      {entry.nickname || `${entry.first_name} ${entry.last_name}`.trim()}
                      {isMe && <span className="sr-only"> (você)</span>}
                    </p>
                    {entry.nickname && (
                      <p className="hidden sm:block font-condensed font-600 text-xs uppercase tracking-widest truncate" style={{ color: "var(--text-muted)" }}>
                        {entry.first_name} {entry.last_name}
                      </p>
                    )}
                    <p className="font-condensed font-700 text-[10px] uppercase tracking-widest" style={{ color: "var(--red)" }}>
                      {getPlayerLevel(entry.points).label}
                    </p>
                  </div>
                </Link>
              </div>
              <div className="col-span-2 text-right">
                <span className="font-condensed font-900 text-lg" style={{ color: entry.rank <= 3 ? "var(--red)" : "var(--text)" }}>
                  {entry.points}
                </span>
                {tab === "evento" && entry.perfect_picks > 0 && (
                  <p className="font-condensed font-600 text-xs" style={{ color: "var(--text-muted)" }}>
                    {entry.perfect_picks} cravada{entry.perfect_picks > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
