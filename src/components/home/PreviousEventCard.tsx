import Link from "next/link";
import type { Event, PreviousEventPerformance } from "@/types";
import { formatEventDate } from "@/lib/utils";
import EventBannerMedia from "./EventBannerMedia";

export default function PreviousEventCard({ event, performance }: { event: Event; performance: PreviousEventPerformance }) {
  return <Link href={`/historico/${event.slug}`} aria-label={`Abrir resultado de ${event.name}`} className="event-rail-card group block overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
    <div className="relative aspect-[16/9] overflow-hidden bg-[var(--hero-ink)]"><EventBannerMedia event={event} alt="" sizes="(max-width: 767px) 82vw, (max-width: 1023px) 44vw, 360px" className="object-cover opacity-85 transition-transform duration-500 group-hover:scale-[1.04]" /></div>
    <div className="border-t border-[var(--border)] p-4"><div className="flex items-start justify-between gap-2"><h3 className="line-clamp-2 min-h-[2.5rem] font-condensed text-base font-900 uppercase leading-tight text-[var(--text)]">{event.name}</h3>{performance.participated && <strong className="shrink-0 font-condensed text-xl font-900 text-[var(--red)]">{performance.totalPoints ?? "—"}<span className="ml-0.5 text-[9px]">PTS</span></strong>}</div><p className="mt-2 font-condensed text-[10px] font-700 uppercase tracking-[0.14em] text-[var(--text-muted)]">{formatEventDate(event.event_date)}</p>{performance.participated ? <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border-light)] pt-3 text-center"><Metric label="Posição" value={performance.rankPosition ? `#${performance.rankPosition}` : "—"} /><Metric label="Acertos" value={performance.correctWinners ?? "—"} /><Metric label="Cravadas" value={performance.perfectPicks ?? "—"} /></div> : <p className="mt-3 border-t border-[var(--border-light)] pt-3 font-condensed text-[10px] font-800 uppercase tracking-[0.14em] text-[var(--text-muted)]">Você não participou</p>}</div>
  </Link>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div><div className="font-condensed text-sm font-900 text-[var(--text)]">{value}</div><div className="font-condensed text-[9px] font-700 uppercase tracking-[0.08em] text-[var(--text-muted)]">{label}</div></div>; }
