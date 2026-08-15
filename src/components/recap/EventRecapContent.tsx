import Link from "next/link";
import { formatEventDate } from "@/lib/utils";
import type { EventRecapData } from "@/types";
import ShareRecapButton from "./ShareRecapButton";

export default function EventRecapContent({
  data,
  currentUserId,
}: {
  data: EventRecapData;
  currentUserId: string;
}) {
  const { event, nextEvent, ranking, aggregateStats, fightStats } = data;

  return (
    <main className="min-h-[100dvh]" style={{ backgroundColor: "var(--bg)" }}>
      <section className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <p className="font-condensed text-xs font-700 uppercase tracking-widest" style={{ color: "var(--red)" }}>
            Recap do Evento
          </p>
          <h1 className="mt-1 font-condensed text-3xl font-900 uppercase tracking-wide md:text-5xl" style={{ color: "var(--text)" }}>
            {event.name}
          </h1>
          <p className="mt-2 font-condensed text-sm font-700 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            {formatEventDate(event.event_date)}
            {event.location && ` · ${event.location}`}
          </p>
        </div>

        {/* Aggregate Stats */}
        <div className="grid gap-px md:grid-cols-4 mb-8" style={{ backgroundColor: "var(--border)" }}>
          {[
            { label: "Jogadores", value: aggregateStats.total_players },
            { label: "Média de pts", value: aggregateStats.average_score },
            { label: "Melhor score", value: aggregateStats.best_score },
            { label: "Cravadas", value: aggregateStats.total_perfect_picks },
          ].map((item) => (
            <div key={item.label} className="p-4" style={{ backgroundColor: "var(--bg-card)" }}>
              <p className="font-condensed text-3xl font-900 leading-none" style={{ color: "var(--red)" }}>
                {item.value}
              </p>
              <p className="mt-2 font-condensed text-[10px] font-700 uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>

        {/* Top 10 Leaderboard */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
            <h2 className="font-condensed text-sm font-900 uppercase tracking-widest px-3 py-1 text-white" style={{ backgroundColor: "var(--red)" }}>
              Top 10
            </h2>
            <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
          </div>

          <div style={{ border: "1px solid var(--border)" }}>
            <div className="grid grid-cols-12 px-4 py-2" style={{ backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
              <div className="col-span-1 font-condensed text-xs font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>#</div>
              <div className="col-span-8 font-condensed text-xs font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Jogador</div>
              <div className="col-span-3 text-right font-condensed text-xs font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Pts</div>
            </div>
            {ranking.slice(0, 10).map((entry) => {
              const isMe = entry.user_id === currentUserId;
              return (
              <div key={entry.user_id} className="grid grid-cols-12 px-4 py-3 items-center" style={{ borderBottom: "1px solid var(--border-light)", backgroundColor: isMe ? "rgba(232,0,26,0.04)" : "transparent", outline: isMe ? "1px solid var(--red)" : undefined, outlineOffset: "-1px" }}>
                <div className="col-span-1">
                  <span className="font-condensed font-900 text-sm" style={{ color: entry.rank <= 3 ? "var(--red)" : "var(--text-muted)" }}>
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                  </span>
                </div>
                <div className="col-span-8">
                  <Link href={`/jogador/${entry.nickname}`} className="font-condensed font-900 text-sm uppercase tracking-wide hover:opacity-80" style={{ color: "var(--text)" }}>
                    {entry.nickname}{isMe ? " (você)" : ""}
                  </Link>
                  <span className="ml-2 font-condensed text-[10px] font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {entry.perfect_picks > 0 && `${entry.perfect_picks} cravada${entry.perfect_picks > 1 ? "s" : ""}`}
                  </span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="font-condensed font-900 text-lg" style={{ color: "var(--text)" }}>
                    {entry.total_points}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Per-Fight Breakdown */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
            <h2 className="font-condensed text-sm font-900 uppercase tracking-widest px-3 py-1 text-white" style={{ backgroundColor: "var(--red)" }}>
              Lutas
            </h2>
            <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
          </div>

          <div className="space-y-3">
            {fightStats.map((fight) => (
              <div key={fight.fight_id} className="p-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between">
                  <p className="font-condensed text-sm font-900 uppercase tracking-wide" style={{ color: "var(--text)" }}>
                    {fight.fighter_a_name} vs {fight.fighter_b_name}
                  </p>
                  {fight.result_confirmed && fight.winner_id && (
                    <span className="font-condensed text-[10px] font-700 uppercase tracking-widest px-2 py-0.5" style={{ backgroundColor: "var(--red)", color: "white" }}>
                      {fight.winner_id === fight.fighter_a_id ? fight.fighter_a_name : fight.fighter_b_name}
                    </span>
                  )}
                </div>

                {/* Pick distribution bar */}
                {fight.total_picks > 0 && (
                  <div className="mt-3">
                    <div className="flex h-5 w-full overflow-hidden" style={{ backgroundColor: "var(--bg)" }}>
                      <div
                        className="flex items-center justify-center font-condensed text-[10px] font-900 text-white transition-all"
                        style={{ width: `${fight.pick_a_percent}%`, backgroundColor: "var(--red)", minWidth: fight.pick_a_percent > 0 ? "fit-content" : undefined }}
                      >
                        {fight.pick_a_percent > 15 && `${fight.pick_a_percent}%`}
                      </div>
                      <div
                        className="flex items-center justify-center font-condensed text-[10px] font-900 text-white transition-all"
                        style={{ width: `${fight.pick_b_percent}%`, backgroundColor: "#333", minWidth: fight.pick_b_percent > 0 ? "fit-content" : undefined }}
                      >
                        {fight.pick_b_percent > 15 && `${fight.pick_b_percent}%`}
                      </div>
                    </div>
                    <div className="mt-1 flex justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                      <span className="font-condensed font-700 uppercase tracking-widest">{fight.fighter_a_name} · {fight.pick_a_percent}%</span>
                      <span className="font-condensed font-700 uppercase tracking-widest">{fight.pick_b_percent}% · {fight.fighter_b_name}</span>
                    </div>
                    <p className="mt-1 text-[10px] font-condensed font-700 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                      {fight.total_picks} picks · {fight.perfect_pick_count} cravada{fight.perfect_pick_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          {nextEvent ? (
            <Link
            href={`/event/${nextEvent.slug}`}
            className="inline-block px-6 py-3 font-condensed text-sm font-900 uppercase tracking-widest text-white"
            style={{ backgroundColor: "var(--red)" }}
          >
            Fazer picks em {nextEvent.name}
            </Link>
          ) : (
            <Link
              href="/ranking"
              className="inline-block px-6 py-3 font-condensed text-sm font-900 uppercase tracking-widest text-white"
              style={{ backgroundColor: "var(--red)" }}
            >
              Ver ranking atualizado
            </Link>
          )}
          <ShareRecapButton eventName={event.name} />
        </div>
      </section>
    </main>
  );
}
