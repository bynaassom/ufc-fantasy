export type MainEventFightCandidate = {
  id: string;
  card_type: string;
  fight_order: number;
  fighter_a?: unknown;
  fighter_b?: unknown;
  [key: string]: any;
};

/** Product rule: only the published main event in order 1 qualifies. */
export function selectHomeMainEventFight(
  fights: MainEventFightCandidate[],
): MainEventFightCandidate | null {
  return fights.find(
    (fight) => fight.card_type === "main" && Number(fight.fight_order) === 1,
  ) ?? null;
}
