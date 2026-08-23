import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import EventPicksClient from "@/components/event/EventPicksClient";
import LiveFeed from "@/components/event/LiveFeed";
import {
  EventAlertButton,
  EventAlertProvider,
} from "@/components/event/EventAlertControls";
import {
  formatEventDate,
  isPicksLocked,
  isPicksOpen,
  timeUntilEvent,
  timeUntilPicksOpen,
} from "@/lib/utils";
import { getEventPageData } from "@/server/services/app";

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 30; // revalida a cada 30s, e imediatamente via revalidatePath

export default async function EventPage(props: EventPageProps) {
  const params = await props.params;
  const { profile, event, existingPicks } = await getEventPageData(params.slug);
  if (!event) {
    notFound();
  }

  const locked = isPicksLocked(event.picks_lock_at);
  const open = isPicksOpen(event.picks_open_at);

  return (
    <div
      className="min-h-[100dvh] md:pb-0"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar profile={profile} />
      <LiveFeed eventSlug={params.slug} />
      <EventAlertProvider
        eventSlug={params.slug}
        disabled={event.status === "completed"}
      >
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/home" className="inline-flex items-center gap-1 mb-4" style={{ color: "var(--text-muted)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-xs font-condensed font-700 uppercase tracking-wider">Eventos</span>
        </Link>
        {/* Event header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {event.status === "live" && (
              <span
                className="flex items-center gap-1.5 text-xs font-bold px-2 py-1"
                style={{ backgroundColor: "var(--red)", color: "white" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                AO VIVO
              </span>
            )}
            {!open && (
              <span
                className="text-xs font-bold px-2 py-1"
                style={{
                  backgroundColor: "var(--bg-card)",
                  color: "var(--red)",
                  border: "1px solid var(--red)",
                }}
              >
                PICKS EM BREVE
              </span>
            )}
            {open && locked && event.status !== "live" && (
              <span
                className="text-xs font-bold px-2 py-1"
                style={{
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
              >
                PICKS FECHADOS
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            <h1
              className="min-w-0 text-3xl md:text-4xl font-black tracking-tight"
              style={{ color: "var(--text)" }}
            >
              {event.name}
            </h1>
            <EventAlertButton />
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-3">
            <span
              className="flex items-center gap-1.5 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatEventDate(event.event_date)}
            </span>
            {event.location && (
              <span
                className="flex items-center gap-1.5 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {event.location}
              </span>
            )}
            {!open && event.picks_open_at && (
              <span
                className="flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: "var(--red)" }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Picks abrem {timeUntilPicksOpen(event.picks_open_at)}
              </span>
            )}
            {open && !locked && (
              <span
                className="flex items-center gap-1.5 text-sm font-semibold"
                style={{ color: "var(--red)" }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Picks fecham {timeUntilEvent(event.picks_lock_at)}
              </span>
            )}
          </div>
        </div>

        {locked && existingPicks && existingPicks.length > 0 && (
          <a
            href={`/share/picks/${encodeURIComponent(params.slug)}/${encodeURIComponent(profile.nickname)}`}
            className="mb-6 block w-full px-5 py-3 text-center font-condensed text-xs font-900 uppercase tracking-widest text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--red)" }}
          >
            Compartilhar meus picks
          </a>
        )}

        <EventPicksClient
          event={event}
          existingPicks={existingPicks || []}
          eventSlug={params.slug}
          picksOpen={open}
        />
      </main>
      </EventAlertProvider>
    </div>
  );
}
