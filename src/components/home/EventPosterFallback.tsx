import { formatEventDate } from "@/lib/utils";
import type { Event } from "@/types";

export default function EventPosterFallback({
  event,
  showCopy = true,
}: {
  event: Event;
  showCopy?: boolean;
}) {
  return (
    <div className="home-event-poster absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="home-event-poster-grid absolute inset-0" />
      <div className="home-event-poster-slash absolute inset-y-[-20%] right-[14%] w-1/4 rotate-[16deg] bg-[var(--red)] opacity-90" />
      <div className="relative z-10 flex h-full flex-col justify-between p-5 md:p-8">
        <div className="font-condensed text-[10px] font-900 uppercase tracking-[0.3em] text-[var(--red)]">UFC FANTASY / EVENT</div>
        {showCopy && (
          <div>
            <div className="mb-2 font-condensed text-[10px] font-700 uppercase tracking-[0.2em] text-white/60">{formatEventDate(event.event_date)}</div>
            <div className="max-w-[75%] font-condensed text-[clamp(1.7rem,7vw,4.5rem)] font-900 uppercase leading-[0.88] tracking-tight text-white">{event.name}</div>
            <div className="mt-3 font-condensed text-xs font-700 uppercase tracking-[0.16em] text-white/65">{event.location || "CARD PRINCIPAL"}</div>
          </div>
        )}
        <div className="flex items-end justify-between font-condensed text-[10px] font-900 uppercase tracking-[0.18em] text-white/50">
          <span>FIGHT NIGHT</span>
          <span>#{event.slug.replace(/[^0-9]/g, "") || "01"}</span>
        </div>
      </div>
    </div>
  );
}
