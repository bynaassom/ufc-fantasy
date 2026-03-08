import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import EventPicksClient from "@/components/event/EventPicksClient";
import {
  formatEventDate,
  isPicksLocked,
  isPicksOpen,
  timeUntilEvent,
  timeUntilPicksOpen,
} from "@/lib/utils";

interface EventPageProps {
  params: { slug: string };
}

export default async function EventPage({ params }: EventPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch event with fights and fighters
  const { data: event } = await supabase
    .from("events")
    .select(
      `
      *,
      fights (
        *,
        fighter_a:fighters!fights_fighter_a_id_fkey(*),
        fighter_b:fighters!fights_fighter_b_id_fkey(*),
        winner:fighters!fights_winner_id_fkey(*)
      )
    `,
    )
    .eq("slug", params.slug)
    .single();

  if (!event) notFound();

  // Fetch user's existing picks for this event
  const { data: existingPicks } = await supabase
    .from("picks")
    .select("*")
    .eq("user_id", user.id)
    .eq("event_id", event.id);

  const locked = isPicksLocked(event.picks_lock_at);
  const open = isPicksOpen(event.picks_open_at);

  return (
    <div
      className="min-h-screen pb-24 md:pb-10"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Event header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            {event.status === "live" && (
              <span
                className="flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded"
                style={{ backgroundColor: "var(--red)", color: "white" }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                AO VIVO
              </span>
            )}
            {!open && (
              <span
                className="text-xs font-bold px-2 py-1 rounded"
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
                className="text-xs font-bold px-2 py-1 rounded"
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

          <h1
            className="text-3xl md:text-4xl font-black tracking-tight"
            style={{ color: "var(--text)" }}
          >
            {event.name}
          </h1>

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

        <EventPicksClient
          event={event}
          existingPicks={existingPicks || []}
          userId={user.id}
          picksOpen={open}
        />
      </main>
    </div>
  );
}
