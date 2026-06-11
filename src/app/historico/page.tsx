import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { formatEventDate } from "@/lib/utils";
import { getHistoryPageData } from "@/server/services/app";
import type { Event as FantasyEvent } from "@/types";

export const revalidate = 3600;

export default async function HistoricoPage() {
  const { profile, events, scoresMap } = await getHistoryPageData();
  const historyEvents = events as FantasyEvent[];
  const historyScores = scoresMap as Record<
    string,
    { total_points: number; perfect_picks: number } | undefined
  >;

  return (
    <div
      className="min-h-screen pb-24 md:pb-10"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar profile={profile} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="red-line">
            <span className="section-title" style={{ fontSize: "1.75rem" }}>
              HISTÓRICO
            </span>
          </div>
        </div>

        {!historyEvents.length ? (
          <div
            className="py-16 text-center"
            style={{ border: "1px solid var(--border)" }}
          >
            <p
              className="font-condensed font-700 uppercase tracking-widest text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Nenhum evento encerrado ainda
            </p>
          </div>
        ) : (
          <div
            className="space-y-0"
            style={{ border: "1px solid var(--border)" }}
          >
            {historyEvents.map((event, i) => {
              const score = historyScores[event.id];
              return (
                <Link
                  key={event.id}
                  href={`/historico/${event.slug}`}
                  className="flex items-center justify-between px-5 py-4 transition-colors"
                  style={{
                    borderBottom:
                      i < historyEvents.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    borderLeft: score
                      ? "3px solid var(--red)"
                      : "3px solid transparent",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-condensed font-900 text-sm uppercase tracking-wide truncate"
                      style={{ color: "var(--text)" }}
                    >
                      {event.name}
                    </p>
                    <p
                      className="font-condensed font-600 text-xs uppercase tracking-widest mt-0.5"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {formatEventDate(event.event_date)}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    {score ? (
                      <>
                        <p
                          className="font-condensed font-900 text-lg"
                          style={{ color: "var(--red)" }}
                        >
                          {score.total_points}{" "}
                          <span
                            className="text-xs font-600"
                            style={{ color: "var(--text-muted)" }}
                          >
                            pts
                          </span>
                        </p>
                        {score.perfect_picks > 0 && (
                          <p
                            className="font-condensed font-600 text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {score.perfect_picks} cravada
                            {score.perfect_picks > 1 ? "s" : ""}
                          </p>
                        )}
                      </>
                    ) : (
                      <p
                        className="font-condensed font-600 text-xs uppercase tracking-widest"
                        style={{ color: "var(--text-muted)" }}
                      >
                        Sem picks
                      </p>
                    )}
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="ml-4 flex-shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
