import Link from "next/link";
import EventBonusLabel from "@/components/event/EventBonusLabel";
import {
  formatEventDate,
  getHomePicksStatusLabel,
  isPicksLocked,
  isPicksOpen,
} from "@/lib/utils";
import type { Event } from "@/types";

function getBonusEventCta(event: Event) {
  if (event.status === "live") return "Acompanhar";
  if (isPicksOpen(event.picks_open_at) && !isPicksLocked(event.picks_lock_at)) {
    return "Fazer picks";
  }
  return "Ver evento";
}

export default function BonusEventPrompt({ events }: { events: Event[] }) {
  if (!events.length) return null;

  return (
    <section aria-labelledby="bonus-events-heading" className="home-reveal">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="bonus-events-heading"
            className="font-condensed text-sm font-900 uppercase tracking-[0.16em] text-[var(--text)]"
          >
            Picks extras
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Valem ranking próprio, sem alterar a classificação acumulada.
          </p>
        </div>
      </div>

      <div className="border border-[var(--border)] bg-[var(--bg-card)]">
        {events.map((event, index) => (
          <Link
            key={event.id}
            href={`/event/${event.slug}`}
            aria-label={`${getBonusEventCta(event)} no evento bônus ${event.name}`}
            className="group grid min-h-11 gap-4 border-l-[3px] border-l-[var(--red)] p-4 transition-colors hover:bg-[var(--bg-elevated)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            style={{
              borderBottom:
                index < events.length - 1 ? "1px solid var(--border)" : undefined,
            }}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <EventBonusLabel />
                <span className="font-condensed text-[10px] font-800 uppercase tracking-[0.12em] text-[var(--text-muted)]">
                  {getHomePicksStatusLabel({
                    picksOpenAt: event.picks_open_at,
                    picksLockAt: event.picks_lock_at,
                  })}
                </span>
              </div>
              <h3 className="mt-2 font-condensed text-lg font-900 uppercase leading-tight text-[var(--text)] sm:text-xl">
                {event.name}
              </h3>
              <p className="mt-1 font-condensed text-[10px] font-700 uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {formatEventDate(event.event_date)}
                {event.location ? ` · ${event.location}` : ""}
              </p>
            </div>

            <span className="min-tap inline-flex w-full items-center justify-center gap-3 bg-[var(--red)] px-5 py-3 font-condensed text-xs font-900 uppercase tracking-[0.14em] text-white transition-opacity group-hover:opacity-90 sm:w-auto">
              {getBonusEventCta(event)}
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
