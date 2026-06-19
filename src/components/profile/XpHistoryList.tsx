import type { XpEvent } from "@/types";
import { formatAdminDateTime } from "@/components/admin/shared";

export default function XpHistoryList({ events }: { events: XpEvent[] }) {
  if (events.length === 0) {
    return (
      <p
        className="text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        Nenhum evento com picks ainda.
      </p>
    );
  }
  return (
    <div>
      <h3
        className="font-condensed font-700 text-sm uppercase tracking-widest mb-3"
        style={{ color: "var(--text)" }}
      >
        Historico de XP
      </h3>
      <div>
        {events.map((ev) => {
          const accPct = Math.round(ev.metadata.accuracy * 100);
          return (
            <div
              key={ev.id}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid var(--border-light)" }}
            >
              <div className="flex-1">
                <div
                  className="font-condensed text-sm"
                  style={{ color: "var(--text)" }}
                >
                  {formatAdminDateTime(ev.created_at)}
                </div>
                <div
                  className="font-condensed text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {ev.metadata.correct_winners}/{ev.metadata.fights_with_picks} vencedores
                </div>
              </div>
              <div className="flex-1 px-4">
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: "var(--border)" }}
                >
                  <div
                    className="h-1.5"
                    style={{
                      width: `${accPct}%`,
                      backgroundColor: "var(--red)",
                    }}
                  />
                </div>
                <div
                  className="font-condensed text-xs mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {accPct}% acerto
                </div>
              </div>
              <div
                className="font-condensed font-900 text-lg"
                style={{ color: "var(--red)" }}
              >
                +{ev.amount} XP
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
