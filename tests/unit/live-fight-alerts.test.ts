import { dispatchLiveFightAlerts } from "@/server/services/live-fight-alerts";

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
  });
});
