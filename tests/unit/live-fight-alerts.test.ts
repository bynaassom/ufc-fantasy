import {
  dispatchFightResultAlerts,
  dispatchLiveFightAlerts,
} from "@/server/services/live-fight-alerts";

const batch = { created: 1, pushSent: 1, pushFailed: 0, pushRemoved: 0 };

describe("live fight alerts", () => {
  it("announces a starting fight without prematurely announcing the following fight", async () => {
    const listRecipientIds = vi.fn(async () => ["user-1"]);
    const createNotifications = vi.fn(async () => batch);
    const fighter = (id: string, name: string) => ({
      id,
      name,
      created_at: "2026-08-23T00:00:00Z",
      updated_at: "2026-08-23T00:00:00Z",
    });

    const result = await dispatchLiveFightAlerts(
      {} as any,
      {
        id: "event-1",
        name: "UFC Fortaleza",
        slug: "ufc-fortaleza",
        fights: [
          {
            id: "fight-current",
            fighter_a: fighter("a", "Lutador A"),
            fighter_b: fighter("b", "Lutador B"),
          },
          {
            id: "fight-next",
            fighter_a: fighter("c", "Lutador C"),
            fighter_b: fighter("d", "Lutador D"),
          },
        ],
      },
      {
        eventId: "official-1",
        name: "UFC Fortaleza",
        startTime: "2026-08-23T20:00:00Z",
        timeZone: "UTC",
        prelimsStartAt: "2026-08-23T20:00:00Z",
        status: "live",
        location: "Fortaleza",
        results: [],
        fights: [
          {
            fightId: "official-current",
            fightOrder: 2,
            status: "Walkouts",
            cardType: "preliminary",
            cardSegment: "Prelims",
            cardSegmentStartTime: null,
            weightClass: "Lightweight",
            isTitleFight: false,
            totalRounds: 3,
            phase: "walkouts",
            currentRound: null,
            roundTime: null,
            latestActionAt: null,
            fighterA: { id: "a", name: "Lutador A" },
            fighterB: { id: "b", name: "Lutador B" },
          },
          {
            fightId: "official-next",
            fightOrder: 1,
            status: "Upcoming",
            cardType: "preliminary",
            cardSegment: "Prelims",
            cardSegmentStartTime: null,
            weightClass: "Welterweight",
            isTitleFight: false,
            totalRounds: 3,
            phase: "upcoming",
            currentRound: null,
            roundTime: null,
            latestActionAt: null,
            fighterA: { id: "c", name: "Lutador C" },
            fighterB: { id: "d", name: "Lutador D" },
          },
        ],
      },
      { listRecipientIds, createNotifications },
    );

    expect(result.created).toBe(1);
    expect(createNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "fight_starting",
        fightId: "fight-current",
      }),
    );
    expect(listRecipientIds).toHaveBeenCalledWith(
      expect.anything(),
      "event-1",
      "fight-current",
      "starting",
    );
    expect(createNotifications).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: "fight_up_next" }),
    );
  });

  it("announces the next fight between bouts", async () => {
    const listRecipientIds = vi.fn(async () => ["user-1"]);
    const createNotifications = vi.fn(async () => batch);
    const fighter = (id: string, name: string) => ({
      id,
      name,
      created_at: "2026-08-23T00:00:00Z",
      updated_at: "2026-08-23T00:00:00Z",
    });

    await dispatchLiveFightAlerts(
      {} as any,
      {
        id: "event-1",
        name: "UFC Fortaleza",
        slug: "ufc-fortaleza",
        fights: [{
          id: "fight-next",
          fighter_a: fighter("c", "Lutador C"),
          fighter_b: fighter("d", "Lutador D"),
        }],
      },
      {
        eventId: "official-1",
        name: "UFC Fortaleza",
        startTime: "2026-08-23T20:00:00Z",
        timeZone: "UTC",
        prelimsStartAt: "2026-08-23T20:00:00Z",
        status: "live",
        location: "Fortaleza",
        results: [],
        fights: [{
          fightId: "official-next",
          fightOrder: 1,
          status: "Upcoming",
          cardType: "preliminary",
          cardSegment: "Prelims",
          cardSegmentStartTime: null,
          weightClass: "Welterweight",
          isTitleFight: false,
          totalRounds: 3,
          phase: "upcoming",
          currentRound: null,
          roundTime: null,
          latestActionAt: null,
          fighterA: { id: "c", name: "Lutador C" },
          fighterB: { id: "d", name: "Lutador D" },
        }],
      },
      { listRecipientIds, createNotifications },
    );

    expect(createNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "fight_up_next",
        fightId: "fight-next",
        targetPath: "/event/ufc-fortaleza#fight-fight-next",
      }),
    );
    expect(listRecipientIds).toHaveBeenCalledWith(
      expect.anything(),
      "event-1",
      "fight-next",
      "up_next",
    );
  });

  it("sends confirmed results only to spoiler opt-ins", async () => {
    const listRecipientIds = vi.fn(async () => ["user-spoiler-opt-in"]);
    const createNotifications = vi.fn(async () => batch);

    const result = await dispatchFightResultAlerts(
      {} as any,
      { id: "event-1", name: "UFC Fortaleza", slug: "ufc-fortaleza" },
      [{
        fight_id: "fight-1",
        winner_id: "fighter-a",
        method: "knockout",
        round: 2,
      }],
      [{
        id: "fight-1",
        fighter_a: { id: "fighter-a", name: "Lutador A" },
        fighter_b: { id: "fighter-b", name: "Lutador B" },
      }],
      { listRecipientIds, createNotifications },
    );

    expect(result.created).toBe(1);
    expect(listRecipientIds).toHaveBeenCalledWith(
      expect.anything(),
      "event-1",
      "fight-1",
      "result",
    );
    expect(createNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userIds: ["user-spoiler-opt-in"],
        type: "fight_result",
        fightResult: "Lutador A venceu por nocaute no R2",
      }),
    );
  });
});
