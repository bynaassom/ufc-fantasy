import { getDisplayName } from "@/lib/utils";
import type { Profile } from "@/types";

export default function HomeSummary({ profile }: { profile: Profile }) {
  return (
    <div className="relative flex min-h-[78px] items-center justify-between gap-4 overflow-hidden border-l-[3px] border-[var(--red)] bg-[var(--hero-ink)] px-4 py-3 text-white sm:min-h-[88px] sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-2/5 bg-[repeating-linear-gradient(135deg,transparent,transparent_9px,rgba(255,255,255,0.045)_9px,rgba(255,255,255,0.045)_10px)]" />
      <div className="relative min-w-0">
        <span className="mb-1 block font-condensed text-[9px] font-900 uppercase tracking-[0.2em] text-white/55">UFC Fantasy / Minha área</span>
        <h1 className="truncate font-condensed text-lg font-900 uppercase tracking-wide sm:text-2xl">
          <span className="text-[var(--red)]">{getDisplayName(profile)}</span>
        </h1>
      </div>
      <div className="relative shrink-0 border-l border-white/20 pl-4 text-right sm:pl-6">
        <span className="block font-condensed text-[9px] font-900 uppercase tracking-[0.18em] text-white/55">Pontuação total</span>
        <strong className="font-condensed text-2xl font-900 leading-none tabular-nums text-white sm:text-4xl">
          {profile.total_points.toLocaleString("pt-BR")}
        </strong>
        <span className="ml-1 font-condensed text-[9px] font-900 uppercase tracking-[0.12em] text-[var(--red)] sm:text-[10px]">PTS</span>
      </div>
    </div>
  );
}
