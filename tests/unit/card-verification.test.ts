import {
  buildVerifiedCardPlan,
  getDueCardVerificationWindow,
  type VerificationFight,
} from "@/lib/card-verification";

const currentFight: VerificationFight = {
  id: "fight-1",
  fighter_a: { name: "Belal Muhammad" },
  fighter_b: { name: "Gabriel Bonfim" },
  card_type: "main",
  fight_order: 1,
  weight_class: "Welterweight",
  is_title_fight: false,
  total_rounds: 3,
  ufc_matchup_url: null,
};

const ufcFight = {
  fmid: "ufc-1",
  fighter_a: { name: "Belal Muhammad", country: "", headshot_url: "" },
  fighter_b: { name: "Gabriel Bonfim", country: "", headshot_url: "" },
  card_type: "main" as const,
  fight_order: 1,
  weight_class: "Welterweight",
  is_title_fight: false,
  total_rounds: 5,
  ufc_matchup_url: "https://www.ufc.com.br/event/test#ufc-1",
};

describe("card-verification", () => {
  it("selects only the most recent due verification window", () => {
    expect(
      getDueCardVerificationWindow({
        picksLockAt: "2026-06-07T20:30:00.000Z",
        now: new Date("2026-06-07T10:30:00.000Z"),
        completedScheduledFors: [],
      }),
    ).toMatchObject({
      window: "t18",
      scheduledFor: "2026-06-07T02:30:00.000Z",
    });
  });

  it("does not repeat a completed window or run after picks close", () => {
    const scheduledFor = "2026-06-04T20:30:00.000Z";

    expect(
      getDueCardVerificationWindow({
        picksLockAt: "2026-06-07T20:30:00.000Z",
        now: new Date("2026-06-05T00:00:00.000Z"),
        completedScheduledFors: [scheduledFor],
      }),
    ).toBeNull();

    expect(
      getDueCardVerificationWindow({
        picksLockAt: "2026-06-07T20:30:00.000Z",
        now: new Date("2026-06-07T20:30:00.000Z"),
        completedScheduledFors: [],
      }),
    ).toBeNull();
  });

  it("does not backfill T-72 after T-18 has already completed", () => {
    expect(
      getDueCardVerificationWindow({
        picksLockAt: "2026-06-07T20:30:00.000Z",
        now: new Date("2026-06-07T10:30:00.000Z"),
        completedScheduledFors: ["2026-06-07T02:30:00.000Z"],
      }),
    ).toBeNull();
  });

  it("applies official card metadata when UFCStats confirms the matchup", () => {
    const plan = buildVerifiedCardPlan({
      window: "t72",
      currentFights: [currentFight],
      ufcFights: [ufcFight],
      ufcStatsFights: [
        {
          fighter_a_name: "Belal Muhammad",
          fighter_b_name: "Gabriel Bonfim",
        },
      ],
    });

    expect(plan.updated).toEqual([
      {
        fight_id: "fight-1",
        fight_name: "Belal Muhammad vs Gabriel Bonfim",
        changes: {
          total_rounds: { from: 3, to: 5 },
          ufc_matchup_url: {
            from: null,
            to: "https://www.ufc.com.br/event/test#ufc-1",
          },
        },
      },
    ]);
    expect(plan.alerts).toEqual([]);
  });

  it("keeps uncertain round and title changes as alerts", () => {
    const plan = buildVerifiedCardPlan({
      window: "t72",
      currentFights: [{ ...currentFight, is_title_fight: true, total_rounds: 5 }],
      ufcFights: [{ ...ufcFight, card_type: "preliminary", fight_order: 2, total_rounds: 3 }],
      ufcStatsFights: [],
    });

    expect(plan.updated).toEqual([]);
    expect(plan.alerts).toEqual(
      expect.arrayContaining([
        expect.stringContaining("rounds"),
        expect.stringContaining("cinturão"),
      ]),
    );
  });

  it("only removes a missing fight at T-18 when both sources agree", () => {
    expect(
      buildVerifiedCardPlan({
        window: "t72",
        currentFights: [currentFight],
        ufcFights: [],
        ufcStatsFights: [],
      }).removed,
    ).toEqual([]);

    expect(
      buildVerifiedCardPlan({
        window: "t18",
        currentFights: [currentFight],
        ufcFights: [],
        ufcStatsFights: [],
      }).removed,
    ).toEqual([
      {
        fight_id: "fight-1",
        fight_name: "Belal Muhammad vs Gabriel Bonfim",
      },
    ]);
  });

  it("does not apply changes when the tie-breaker source is unavailable", () => {
    const plan = buildVerifiedCardPlan({
      window: "t18",
      currentFights: [currentFight],
      ufcFights: [],
      ufcStatsFights: [],
      ufcStatsAvailable: false,
    });

    expect(plan.added).toEqual([]);
    expect(plan.updated).toEqual([]);
    expect(plan.removed).toEqual([]);
    expect(plan.alerts).toEqual([
      "UFCStats indisponível; nenhuma alteração automática aplicada",
    ]);
  });
});
