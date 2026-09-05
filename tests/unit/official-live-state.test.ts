import type { UfcLiveCardFight, UfcLiveEvent } from "@/lib/ufc-live-api";
import { buildOfficialLiveState } from "@/server/services/official-live-state";
import type { FightWithFighters } from "@/types";

function officialFight(
  fightId: string,
  fighterA: string,
  fighterB: string,
  fightOrder = 1,
): UfcLiveCardFight {
  return {
    fightId,
    fightOrder,
    status: "Upcoming",
    cardType: "preliminary",
    cardSegment: "Prelims",
    cardSegmentStartTime: null,
    weightClass: "Lightweight",
    isTitleFight: false,
    totalRounds: 3,
    phase: "upcoming",
    currentRound: null,
    roundTime: null,
    latestActionAt: null,
    fighterA: { id: `${fightId}-a`, name: fighterA },
    fighterB: { id: `${fightId}-b`, name: fighterB },
  };
}

function officialEvent(fights: UfcLiveCardFight[]): UfcLiveEvent {
  return {
    eventId: "official-event",
    name: "UFC Test",
    startTime: "2026-09-05T16:00:00Z",
    timeZone: "UTC",
    prelimsStartAt: "2026-09-05T16:00:00Z",
    status: "upcoming",
    location: "Paris",
    results: [],
    fights,
  };
}

function localFight(
  id: string,
  fighterA: string,
  fighterB: string,
): Pick<FightWithFighters, "id" | "fighter_a" | "fighter_b"> {
  const fighter = (suffix: string, name: string) => ({
    id: `${id}-${suffix}`,
    name,
    created_at: "2026-09-05T00:00:00Z",
    updated_at: "2026-09-05T00:00:00Z",
  });

  return {
    id,
    fighter_a: fighter("a", fighterA),
    fighter_b: fighter("b", fighterB),
  };
}

describe("official live fight matching", () => {
  it("matches an official name that omits a local middle name", () => {
    const state = buildOfficialLiveState(
      officialEvent([
        officialFight("official-duclos", "Matthieu Duclos", "Luis Felipe Dias"),
      ]),
      [
        localFight(
          "fight-duclos",
          "Matthieu Letho Duclos",
          "Luis Felipe Dias",
        ),
      ],
    );

    expect(state.fights[0].localFightId).toBe("fight-duclos");
  });

  it("matches name variants even when the official corners are reversed", () => {
    const state = buildOfficialLiveState(
      officialEvent([
        officialFight("official-reversed", "Jose Aldo", "Conor McGregor Jr."),
      ]),
      [localFight("fight-reversed", "Conor McGregor", "José Aldo")],
    );

    expect(state.fights[0].localFightId).toBe("fight-reversed");
  });

  it("refuses an ambiguous fuzzy match instead of linking the wrong fight", () => {
    const state = buildOfficialLiveState(
      officialEvent([
        officialFight("official-ambiguous", "A. Silva", "Jordan Lee"),
      ]),
      [
        localFight("fight-alex", "Alex Silva", "Jordan Lee"),
        localFight("fight-alexandre", "Alexandre Silva", "Jordan Lee"),
      ],
    );

    expect(state.fights[0].localFightId).toBeNull();
  });

  it("claims each local fight at most once", () => {
    const state = buildOfficialLiveState(
      officialEvent([
        officialFight("official-first", "Matthieu Duclos", "Luis Felipe Dias", 2),
        officialFight("official-duplicate", "M. Duclos", "Luis Felipe Dias", 1),
      ]),
      [
        localFight(
          "fight-duclos",
          "Matthieu Letho Duclos",
          "Luis Felipe Dias",
        ),
      ],
    );

    expect(state.fights.map((fight) => fight.localFightId)).toEqual([
      "fight-duclos",
      null,
    ]);
  });
});
