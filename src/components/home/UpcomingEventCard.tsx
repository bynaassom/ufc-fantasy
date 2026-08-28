import Link from "next/link";
import type { Event } from "@/types";
import { formatEventDate } from "@/lib/utils";
import EventBannerMedia from "./EventBannerMedia";
import EventBonusLabel from "@/components/event/EventBonusLabel";

export default function UpcomingEventCard({ event }: { event: Event }) {
  return <Link href={`/event/${event.slug}`} aria-label={`Abrir ${event.name}, em ${formatEventDate(event.event_date)}`} className="event-rail-card group block overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
    <div className="relative aspect-[16/9] overflow-hidden bg-[var(--hero-ink)]"><EventBannerMedia event={event} alt="" sizes="(max-width: 767px) 82vw, (max-width: 1023px) 44vw, 360px" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />{event.is_bonus && <div className="absolute left-3 top-3"><EventBonusLabel overlay /></div>}</div>
    <div className="border-t-[3px] border-[var(--red)] p-4"><h3 className="line-clamp-2 min-h-[2.5rem] font-condensed text-base font-900 uppercase leading-tight text-[var(--text)]">{event.name}</h3><p className="mt-2 font-condensed text-[10px] font-700 uppercase tracking-[0.14em] text-[var(--text-muted)]">{formatEventDate(event.event_date)}{event.location ? ` · ${event.location}` : ""}</p></div>
  </Link>;
}
