"use client";

import { useEffect, useState } from "react";
import type { Fighter } from "@/types";
import type { FighterFormEntry, FighterPickStats } from "@/server/repositories/fighter-profile";

interface Props {
  fighter: Fighter;
  form: FighterFormEntry[];
  pickStats: FighterPickStats;
  slug: string;
}

interface FighterStats {
  record: string;
  physical: { height: string; weight: string; reach: string; legReach: string };
  striking: { slpm: string; sapm: string; strAcc: string; strDef: string };
  grappling: { tdAvg: string; tdAcc: string; tdDef: string; subAvg: string };
  wins_by: { ko: { count: string; pct: string }; dec: { count: string; pct: string }; sub: { count: string; pct: string } };
}

export default function FighterProfileClient({ fighter, form, pickStats, slug }: Props) {
  const [stats, setStats] = useState<FighterStats | null>(null);
  const [statsError, setStatsError] = useState(false);

  useEffect(() => {
    fetch(`/api/fighter-stats/${slug}?name=${encodeURIComponent(fighter.name)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setStatsError(true); return; }
        setStats(data);
      })
      .catch(() => setStatsError(true));
  }, [slug, fighter.name]);

  return (
    <div>
      {/* Hero */}
      <div className="flex flex-col items-center mb-8">
        {fighter.headshot_url && (
          <img
            src={fighter.headshot_url}
            alt={fighter.name}
            className="w-32 h-32 rounded-full object-cover mb-4"
            style={{ border: "4px solid var(--red)" }}
          />
        )}
        <h1
          className="font-condensed font-900 text-3xl uppercase text-center"
          style={{ color: "var(--text)" }}
        >
          {fighter.name}
        </h1>
        {fighter.country && (
          <p
            className="font-condensed text-sm uppercase tracking-widest mt-1"
            style={{ color: "var(--text-muted)" }}
          >
            {fighter.country}
          </p>
        )}
      </div>

      {/* Record */}
      {stats?.record && stats.record !== "--" && (
        <div className="mb-6 p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <h3 className="font-condensed font-700 text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Recorde
          </h3>
          <p className="font-condensed font-900 text-2xl" style={{ color: "var(--text)" }}>
            {stats.record}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      {stats && !statsError && (
        <div className="mb-6 p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <h3 className="font-condensed font-700 text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Estatisticas (UFC)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Striking/min", value: stats.striking.slpm },
              { label: "Precisao", value: stats.striking.strAcc !== "--" ? `${stats.striking.strAcc}%` : "--" },
              { label: "Defesa", value: stats.striking.strDef !== "--" ? `${stats.striking.strDef}%` : "--" },
              { label: "Absorvidos/min", value: stats.striking.sapm },
              { label: "Quedas/15min", value: stats.grappling.tdAvg },
              { label: "Prec. Queda", value: stats.grappling.tdAcc !== "--" ? `${stats.grappling.tdAcc}%` : "--" },
              { label: "Def. Queda", value: stats.grappling.tdDef !== "--" ? `${stats.grappling.tdDef}%` : "--" },
              { label: "Finaliz/15min", value: stats.grappling.subAvg },
            ].map((s) => (
              <div key={s.label}>
                <p className="font-condensed text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  {s.label}
                </p>
                <p className="font-condensed font-900 text-xl" style={{ color: "var(--text)" }}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
          {stats.physical.height !== "--" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid var(--border-light)" }}>
              {[
                { label: "Altura", value: stats.physical.height },
                { label: "Peso", value: stats.physical.weight },
                { label: "Envergadura", value: stats.physical.reach },
                { label: "Pernas", value: stats.physical.legReach },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-condensed text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {s.label}
                  </p>
                  <p className="font-condensed font-900 text-lg" style={{ color: "var(--text)" }}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {statsError && (
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Estatisticas UFC indisponiveis no momento.
        </p>
      )}

      {!stats && !statsError && (
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Carregando estatisticas...
        </p>
      )}

      {/* Form Timeline */}
      {form.length > 0 && (
        <div className="mb-6 p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
          <h3 className="font-condensed font-700 text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
            Ultimas Lutas
          </h3>
          {form.map((f, i) => {
            const dot = f.result === "W" ? "🟢" : f.result === "L" ? "🔴" : "⚪";
            return (
              <div
                key={i}
                className="flex items-center gap-3 py-2"
                style={{ borderBottom: i < form.length - 1 ? "1px solid var(--border-light)" : "none" }}
              >
                <span className="text-sm">{dot}</span>
                <div className="flex-1">
                  <p className="font-condensed text-sm" style={{ color: "var(--text)" }}>
                    vs {f.opponent_name} · {f.method.toUpperCase()}
                    {f.round ? ` Rd ${f.round}` : ""}
                  </p>
                  <p className="font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
                    {f.event_name} · {new Date(f.event_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fantasy Pick Stats */}
      <div className="mb-6 p-4" style={{ backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border)" }}>
        <h3 className="font-condensed font-700 text-xs uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
          No UFC Fantasy
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-condensed text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Escolhido em
            </p>
            <p className="font-condensed font-900 text-xl" style={{ color: "var(--text)" }}>
              {pickStats.total_events_picked} evento{pickStats.total_events_picked !== 1 ? "s" : ""}
            </p>
          </div>
          <div>
            <p className="font-condensed text-xs uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Venceu quando escolhido
            </p>
            <p className="font-condensed font-900 text-xl" style={{ color: "var(--text)" }}>
              {pickStats.win_when_picked}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
