import Link from "next/link";
import { formatEventDate, getHomePicksStatusLabel } from "@/lib/utils";
import type { Event as FantasyEvent } from "@/types";

type ActivityFeedProps = {
  currentEvent: FantasyEvent | null;
  upcomingEvents: FantasyEvent[];
  completedEvents: FantasyEvent[];
};

type ActivityItem = {
  id: string;
  href?: string;
  label: string;
  title: string;
  meta: string;
  tone: "red" | "blue" | "muted";
};

function activityColor(tone: ActivityItem["tone"]) {
  if (tone === "red") return "var(--red)";
  if (tone === "blue") return "var(--blue)";
  return "var(--text-muted)";
}

export default function ActivityFeed({
  currentEvent,
  upcomingEvents,
  completedEvents,
}: ActivityFeedProps) {
  const items: ActivityItem[] = [];

  if (currentEvent) {
    items.push({
      id: `current-${currentEvent.id}`,
      href: `/event/${currentEvent.slug}`,
      label: currentEvent.status === "live" ? "AO VIVO" : "PICKS",
      title: currentEvent.name,
      meta:
        currentEvent.status === "live"
          ? "Resultados sendo atualizados"
          : getHomePicksStatusLabel({
              picksOpenAt: currentEvent.picks_open_at,
              picksLockAt: currentEvent.picks_lock_at,
            }),
      tone: "red",
    });
  }

  upcomingEvents.slice(0, 2).forEach((event) => {
    items.push({
      id: `upcoming-${event.id}`,
      label: "CARD",
      title: event.name,
      meta: `${formatEventDate(event.event_date)}${event.location ? ` · ${event.location}` : ""}`,
      tone: "blue",
    });
  });

  completedEvents.slice(0, 2).forEach((event) => {
    items.push({
      id: `completed-${event.id}`,
      href: `/historico/${event.slug}`,
      label: "RESULTADO",
      title: event.name,
      meta: `Evento encerrado · ${formatEventDate(event.event_date)}`,
      tone: "muted",
    });
  });

  if (!items.length) return null;

  return (
    <section className="mb-10">
      <div className="red-line mb-4">
        <span className="section-title">Atividade</span>
      </div>
      <div style={{ border: "1px solid var(--border)" }}>
        {items.map((item, index) => {
          const content = (
            <>
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className="font-condensed font-900 text-[10px] uppercase tracking-widest px-2 py-1 flex-shrink-0"
                  style={{
                    color: activityColor(item.tone),
                    border: `1px solid ${activityColor(item.tone)}`,
                  }}
                >
                  {item.label}
                </span>
                <div className="min-w-0">
                  <p
                    className="font-condensed font-900 text-sm uppercase tracking-wide truncate"
                    style={{ color: "var(--text)" }}
                  >
                    {item.title}
                  </p>
                  <p
                    className="font-condensed font-600 text-xs uppercase tracking-widest mt-0.5"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.meta}
                  </p>
                </div>
              </div>
              {item.href && (
                <span
                  className="font-condensed font-900 text-xs uppercase tracking-widest flex-shrink-0"
                  style={{ color: "var(--red)" }}
                >
                  ABRIR
                </span>
              )}
            </>
          );

          const style = {
            borderBottom: index < items.length - 1 ? "1px solid var(--border)" : "none",
          };

          if (!item.href) {
            return (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4" style={style}>
                {content}
              </div>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between gap-4 px-5 py-4 hover-bg-elevated"
              style={style}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
