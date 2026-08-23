import type { FightWithFighters } from "@/types";
import { getWeightClassLabel } from "@/lib/ufc-weight";
import { FightAlertButton } from "@/components/event/EventAlertControls";

export default function CompanionFightCard({
  fight,
  number,
}: {
  fight: FightWithFighters;
  number: number;
}) {
  const completed = fight.result_confirmed && Boolean(fight.winner_id);
  const fightName = `${fight.fighter_a.name} vs ${fight.fighter_b.name}`;

  return (
    <article
      id={`fight-${fight.id}`}
      className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b px-4 py-5 last:border-b-0 sm:px-5"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="font-condensed text-xl font-900 tabular-nums text-[var(--border)]">
        {String(number).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-condensed text-[9px] font-900 uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {getWeightClassLabel(fight.weight_class)}
          </span>
          {fight.is_title_fight && (
            <span className="bg-[var(--red)] px-1.5 py-0.5 font-condensed text-[8px] font-900 uppercase tracking-widest text-white">
              título
            </span>
          )}
          {completed && (
            <span className="border border-[var(--border)] px-1.5 py-0.5 font-condensed text-[8px] font-900 uppercase tracking-widest text-[var(--text-muted)]">
              encerrada
            </span>
          )}
        </div>
        <h3 className="font-condensed text-lg font-900 uppercase leading-tight text-[var(--text)] sm:text-xl">
          {fight.fighter_a.name}
          <span className="mx-2 text-xs text-[var(--red)]">VS</span>
          {fight.fighter_b.name}
        </h3>
      </div>
      <FightAlertButton fightId={fight.id} fightName={fightName} completed={completed} />
    </article>
  );
}
