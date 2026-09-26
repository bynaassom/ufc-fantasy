import Link from "next/link";
import { formatEventDate, getHomePicksStatusLabel, isPicksLocked, isPicksOpen } from "@/lib/utils";
import type { Event } from "@/types";
import EventBannerMedia from "./EventBannerMedia";
import EventBonusLabel from "@/components/event/EventBonusLabel";

type Props = {
  event: Event;
  progress: { picked: number; total: number };
};

export default function CurrentEventHero({ event, progress }: Props) {
  const locked = isPicksLocked(event.picks_lock_at);
  const open = isPicksOpen(event.picks_open_at) && !locked;
  const complete = progress.total > 0 && progress.picked >= progress.total;
  const picked = Math.min(progress.picked, progress.total);
  const completion = progress.total > 0 ? Math.round((picked / progress.total) * 100) : 0;
  const cta = event.status === "live"
    ? "Acompanhar ao vivo"
    : !open ? "Ver card" : complete ? "Revisar picks" : progress.picked > 0 ? "Continuar picks" : "Fazer picks";
  return (
    <section aria-labelledby="current-event-heading" className="home-reveal">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-2">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-5 w-[3px] bg-[var(--red)]" />
          <div>
            <span className="block font-condensed text-[9px] font-900 uppercase tracking-[0.2em] text-[var(--text-muted)]">UFC Fantasy / Card principal</span>
            <h2 id="current-event-heading" className="font-condensed text-sm font-900 uppercase tracking-[0.11em] text-[var(--text)]">{event.status === "live" ? "Ao vivo agora" : "Evento atual"}</h2>
          </div>
        </div>
        <span className="shrink-0 font-condensed text-[10px] font-800 uppercase tracking-[0.18em] text-[var(--text-muted)]">{formatEventDate(event.event_date)}</span>
      </div>
      <Link href={`/event/${event.slug}`} className="group block overflow-hidden border border-[var(--border)] focus-visible:outline-offset-[-2px]">
        <div className="relative aspect-[16/8] min-h-[230px] overflow-hidden bg-[var(--hero-ink)] sm:aspect-[16/7]">
          <EventBannerMedia event={event} alt={event.name} priority sizes="(max-width: 767px) calc(100vw - 32px), 1180px" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" showOverlay />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
            {event.status === "live" && <span className="mb-3 inline-flex items-center gap-2 bg-[var(--red)] px-2 py-1 font-condensed text-[10px] font-900 uppercase tracking-[0.18em] text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Ao vivo</span>}
            {event.is_bonus && <div className="mb-3"><EventBonusLabel overlay /></div>}
            <h3 className="line-clamp-2 max-w-[90%] font-condensed text-[clamp(1.75rem,8vw,4.75rem)] font-900 uppercase leading-[0.86] tracking-tight text-white">{event.name}</h3>
            <p className="mt-3 line-clamp-1 font-condensed text-xs font-700 uppercase tracking-[0.16em] text-white/70">{event.location || "UFC Fantasy"}</p>
          </div>
          <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center border border-white/55 bg-black/25 text-lg text-white transition-transform duration-300 group-hover:translate-x-1 md:right-6 md:top-6" aria-hidden="true">→</span>
        </div>
        <div className="grid gap-4 border-t-[3px] border-[var(--red)] bg-[var(--bg-card)] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 sm:gap-x-5">
            <div className="row-span-2 border-r border-[var(--border)] pr-4 sm:pr-5">
              <span className="block font-condensed text-[9px] font-900 uppercase tracking-[0.18em] text-[var(--text-muted)]">Seus picks</span>
              <strong className="block font-condensed text-3xl font-900 leading-none tabular-nums text-[var(--text)] sm:text-4xl">
                {progress.total > 0 ? <>{String(picked).padStart(2, "0")}<span className="text-[var(--text-muted)]">/{String(progress.total).padStart(2, "0")}</span></> : "—"}
              </strong>
            </div>
            <div className="flex items-center justify-between gap-3 font-condensed text-[10px] font-900 uppercase tracking-[0.15em] text-[var(--text)]">
              <span className="flex min-w-0 items-center gap-2">
                {event.status === "live" ? <><span className="h-2 w-2 animate-pulse bg-[var(--red)]" />Evento em andamento</> : getHomePicksStatusLabel({ picksOpenAt: event.picks_open_at, picksLockAt: event.picks_lock_at })}
              </span>
              {progress.total > 0 && <span className="shrink-0 text-[var(--red)]">{completion}%</span>}
            </div>
            <div className="flex h-2 items-stretch gap-[3px]" role="progressbar" aria-label="Palpites preenchidos" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={picked}>
              {progress.total > 0 ? Array.from({ length: progress.total }, (_, index) => (
                <span key={index} className={`min-w-0 flex-1 ${index < picked ? "bg-[var(--red)]" : "bg-[var(--border)]"}`} />
              )) : <span className="w-full bg-[var(--border)]" />}
            </div>
          </div>
          <span className="inline-flex min-h-[46px] items-center justify-center gap-4 border border-[var(--red)] bg-[var(--red)] px-5 py-3 font-condensed text-xs font-900 uppercase tracking-[0.16em] text-white transition-colors group-hover:bg-transparent group-hover:text-[var(--text)]">{cta}<span aria-hidden="true" className="text-lg leading-none">→</span></span>
        </div>
      </Link>
    </section>
  );
}
