import type { XpSummary as XpSummaryType } from "@/types";

export default function XpSummary({ data }: { data: XpSummaryType }) {
  const progressPct = Math.round(data.progressToNextLevel * 100);
  return (
    <div
      className="p-4"
      style={{
        backgroundColor: "var(--bg-elevated)",
        border: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div
            className="font-condensed font-900 text-2xl uppercase"
            style={{ color: "var(--red)" }}
          >
            {data.levelTitle}
          </div>
          <div
            className="font-condensed text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Nivel {data.level}
          </div>
        </div>
        <div className="text-right">
          <div
            className="font-condensed font-700 text-2xl"
            style={{ color: "var(--text)" }}
          >
            {data.xpTotal.toLocaleString("pt-BR")} XP
          </div>
          <div
            className="font-condensed text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Falta {data.nextLevelXp} XP
          </div>
        </div>
      </div>

      <div
        className="h-2 w-full mb-4"
        style={{ backgroundColor: "var(--border)" }}
      >
        <div
          className="h-2"
          style={{
            width: `${progressPct}%`,
            backgroundColor: "var(--red)",
            transition: "width 0.3s",
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div
            className="font-condensed text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Sequencia Atual
          </div>
          <div
            className="font-condensed font-900 text-xl"
            style={{ color: "var(--text)" }}
          >
            {data.currentStreak > 0 ? `${data.currentStreak} evento${data.currentStreak === 1 ? "" : "s"}` : "—"}
          </div>
        </div>
        <div>
          <div
            className="font-condensed text-xs uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Melhor Sequencia
          </div>
          <div
            className="font-condensed font-900 text-xl"
            style={{ color: "var(--text)" }}
          >
            {data.bestStreak > 0 ? `${data.bestStreak} evento${data.bestStreak === 1 ? "" : "s"}` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
