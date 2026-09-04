import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import EventPicksClient from "@/components/event/EventPicksClient";
import LiveFeed from "@/components/event/LiveFeed";
import EventBonusLabel from "@/components/event/EventBonusLabel";
import EventBannerMedia from "@/components/home/EventBannerMedia";
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
  const picksTiming = !open
    ? event.picks_open_at
      ? `Abrem ${timeUntilPicksOpen(event.picks_open_at)}`
      : "Aguardando abertura"
    : !locked
      ? `Fecham ${timeUntilEvent(event.picks_lock_at)}`
      : event.status === "live"
        ? "Card em andamento"
        : "Picks encerrados";

  return (
    <div className="event-page min-h-[100dvh] bg-[var(--bg)] md:pb-0">
      <Navbar profile={profile} />
      <LiveFeed
        eventSlug={params.slug}
        initialStatus={event.status}
        eventStartsAt={event.event_date}
      />
      <EventAlertProvider
        eventSlug={params.slug}
        eventName={event.name}
        disabled={event.status === "completed"}
      >
      <main className="pb-24 md:pb-16">
        <div className="mx-auto w-full max-w-[1180px] px-4 pt-4 md:px-6 md:pt-6">
          <Link
            href="/home"
            className="event-back-link min-tap inline-flex w-auto items-center gap-2 px-1 font-condensed text-[11px] font-800 uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Eventos
          </Link>

          <section className="event-masthead mt-2 overflow-hidden border border-[var(--border)] bg-[var(--hero-ink)]" aria-labelledby="event-title">
            <div className="relative min-h-[260px] overflow-hidden sm:aspect-[16/8] sm:min-h-[360px] lg:aspect-[16/7]">
              <EventBannerMedia
                event={event}
                alt=""
                priority
                sizes="(max-width: 767px) calc(100vw - 32px), 1180px"
                className="object-cover"
                showOverlay
                showFallbackCopy={false}
              />
              <div className="event-masthead-veil absolute inset-0" aria-hidden="true" />
              <div className="event-masthead-grid absolute inset-0" aria-hidden="true" />

              <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-condensed text-[11px] font-900 uppercase tracking-[0.24em] text-white/75">
                    UFC Fantasy / Fight Card
                  </p>
                  <div className="flex flex-wrap justify-end gap-2">
                    {event.status === "live" && (
                      <span className="inline-flex min-h-7 items-center gap-2 bg-[var(--red)] px-2.5 font-condensed text-[11px] font-900 uppercase tracking-[0.16em] text-white">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        Ao vivo
                      </span>
                    )}
                    {event.is_bonus && <EventBonusLabel overlay />}
                    {!open && (
                      <span className="inline-flex min-h-7 items-center border border-white/55 bg-black/55 px-2.5 font-condensed text-[11px] font-900 uppercase tracking-[0.14em] text-white">
                        Picks em breve
                      </span>
                    )}
                    {open && locked && event.status !== "live" && (
                      <span className="inline-flex min-h-7 items-center border border-white/35 bg-black/55 px-2.5 font-condensed text-[11px] font-900 uppercase tracking-[0.14em] text-white/75">
                        Picks fechados
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-w-4xl">
                  <p className="mb-3 font-condensed text-xs font-800 uppercase tracking-[0.22em] text-[#ff5c6d]">
                    Noite de luta
                  </p>
                  <h1 id="event-title" className="max-w-[95%] text-balance font-condensed text-[clamp(2rem,9vw,6.25rem)] font-900 uppercase leading-[0.82] tracking-[-0.035em] text-white [text-shadow:0_3px_28px_rgba(0,0,0,0.85)]">
                    {event.name}
                  </h1>
                  <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 font-condensed text-xs font-700 uppercase tracking-[0.12em] text-white/80">
                    <span>{formatEventDate(event.event_date)}</span>
                    {event.location && <span>{event.location}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="event-command-strip grid grid-cols-2 border-t-[3px] border-[var(--red)] bg-[var(--bg-card)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-stretch">
              <div className="flex items-center justify-between gap-4 border-b border-r border-[var(--border)] px-4 py-3 sm:block sm:border-b-0 sm:px-5">
                <span className="font-condensed text-[11px] font-800 uppercase tracking-[0.16em] text-[var(--text-muted)]">Card de luta</span>
                <strong className="font-condensed text-lg font-900 uppercase text-[var(--text)] sm:mt-0.5 sm:block">{event.fights.length} confrontos</strong>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3 sm:block sm:border-b-0 sm:border-r sm:px-5">
                <span className="font-condensed text-[11px] font-800 uppercase tracking-[0.16em] text-[var(--text-muted)]">Janela de picks</span>
                <strong className="font-condensed text-lg font-900 uppercase text-[var(--red-text)] sm:mt-0.5 sm:block">{picksTiming}</strong>
              </div>
              <div className="col-span-2 flex items-center justify-end px-4 py-2.5 sm:col-span-1 sm:px-5 sm:py-3">
                <EventAlertButton />
              </div>
            </div>
          </section>
        </div>

        <div className="mx-auto w-full max-w-[760px] px-4 pt-6 md:px-6 md:pt-8">
          {locked && existingPicks && existingPicks.length > 0 && (
            <a
              href={`/share/picks/${encodeURIComponent(params.slug)}/${encodeURIComponent(profile.nickname)}`}
              className="event-share-cta mb-6 flex min-h-12 w-full items-center justify-center gap-3 bg-[var(--red)] px-5 py-3 text-center font-condensed text-xs font-900 uppercase tracking-[0.16em] text-white transition-colors hover:bg-[var(--red-dark)]"
            >
              Compartilhar meus picks
              <span aria-hidden="true">↗</span>
            </a>
          )}

          <EventPicksClient
            event={event}
            existingPicks={existingPicks || []}
            eventSlug={params.slug}
            picksOpen={open}
          />
        </div>
      </main>
      </EventAlertProvider>
    </div>
  );
}
