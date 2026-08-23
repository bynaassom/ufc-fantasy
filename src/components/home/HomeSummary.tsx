import { getDisplayName } from "@/lib/utils";
import type { Profile } from "@/types";

export default function HomeSummary({ profile }: { profile: Profile }) {
  return (
    <div className="flex min-h-[42px] items-center justify-between gap-4 border-b border-[var(--border)] py-3">
      <h1 className="font-condensed text-lg font-900 uppercase tracking-wide text-[var(--text)] sm:text-xl">
        Olá, <span className="text-[var(--red)]">{getDisplayName(profile)}</span>
      </h1>
      <div className="shrink-0 text-right">
        <span className="font-condensed text-[10px] font-700 uppercase tracking-[0.16em] text-[var(--text-muted)]">Total</span>
        <strong className="ml-2 font-condensed text-lg font-900 text-[var(--text)] sm:text-xl">{profile.total_points.toLocaleString("pt-BR")} pts</strong>
      </div>
    </div>
  );
}
