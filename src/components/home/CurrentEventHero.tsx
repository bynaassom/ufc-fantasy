import Link from "next/link";
import { formatEventDate, getHomePicksStatusLabel, isPicksLocked, isPicksOpen } from "@/lib/utils";
import type { Event } from "@/types";
import EventBannerMedia from "./EventBannerMedia";

type Props = {
  event: Event;
  progress: { picked: number; total: number };
};

export default function CurrentEventHero({ event, progress }: Props) {
  const locked = isPicksLocked(event.picks_lock_at);
  const open = isPicksOpen(event.picks_open_at) && !locked;
  const complete = progress.total > 0 && progress.picked >= progress.total;
  const cta = event.status === "live"
    ? "Acompanhar ao vivo"
    : !open ? "Ver card" : complete ? "Revisar picks" : progress.picked > 0 ? "Continuar picks" : "Fazer picks";
  return (
    <section aria-labelledby="current-event-heading" className="home-reveal">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="red-line !mb-0"><h2 id="current-event-heading" className="section-title">{event.status === "live" ? "Ao vivo agora" : "Evento atual"}</h2></div>
        <span className="font-condensed text-[10px] font-800 uppercase tracking-[0.18em] text-[var(--text-muted)]">{formatEventDate(event.event_date)}</span>
      </div>
      <Link href={`/event/${event.slug}`} className="group block overflow-hidden border border-[var(--border)] focus-visible:outline-offset-[-2px]">
        <div className="relative aspect-[16/8] min-h-[230px] overflow-hidden bg-[var(--hero-ink)] sm:aspect-[16/7]">
          <EventBannerMedia event={event} alt={event.name} priority sizes="(max-width: 767px) calc(100vw - 32px), 1180px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" showOverlay />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
            {event.status === "live" && <span className="mb-3 inline-flex items-center gap-2 bg-[var(--red)] px-2 py-1 font-condensed text-[10px] font-900 uppercase tracking-[0.18em] text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Ao vivo</span>}
            <h3 className="line-clamp-2 max-w-[90%] font-condensed text-[clamp(1.75rem,8vw,4.75rem)] font-900 uppercase leading-[0.86] tracking-tight text-white">{event.name}</h3>
            <p className="mt-3 line-clamp-1 font-condensed text-xs font-700 uppercase tracking-[0.16em] text-white/70">{event.location || "UFC Fantasy"}</p>
          </div>
          <span className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center border border-white/45 text-white transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">→</span>
        </div>
        <div className="grid gap-4 border-t-[3px] border-[var(--red)] bg-[var(--bg-card)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3 font-condensed text-xs font-900 uppercase tracking-[0.15em] text-[var(--text)]"><span>{progress.total > 0 ? `${Math.min(progress.picked, progress.total)}/${progress.total} picks` : getHomePicksStatusLabel({ picksOpenAt: event.picks_open_at, picksLockAt: event.picks_lock_at })}</span><span className="text-[var(--text-muted)]">{progress.total > 0 ? Math.round((Math.min(progress.picked, progress.total) / progress.total) * 100) : "—"}%</span></div>
            {progress.total > 0 && <div className="h-1.5 overflow-hidden bg-[var(--border)]"><div className="h-full bg-[var(--red)] transition-[width] duration-500" style={{ width: `${Math.min(100, (progress.picked / progress.total) * 100)}%` }} /></div>}
            <p className="mt-2 font-condensed text-[10px] font-700 uppercase tracking-[0.14em] text-[var(--text-muted)]">{getHomePicksStatusLabel({ picksOpenAt: event.picks_open_at, picksLockAt: event.picks_lock_at })}</p>
          </div>
          <span className="inline-flex min-h-[44px] items-center justify-center gap-3 bg-[var(--red)] px-5 py-3 font-condensed text-xs font-900 uppercase tracking-[0.16em] text-white">{cta}<span aria-hidden="true">→</span></span>
        </div>
      </Link>
    </section>
  );
}
