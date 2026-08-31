import {
  buildUfcAutomaticTimingUpdate,
  buildUfcLiveEventUrl,
  extractUfcLiveEventId,
  parseUfcLiveEventPayload,
} from "@/lib/ufc-live-api";

const fight = {
  FightId: 12910,
  FightOrder: 1,
  Status: "Final",
  CardSegment: "Main",
  CardSegmentStartTime: "2026-08-16T01:00Z",
  WeightClass: { Description: "Welterweight", CatchWeight: null },
  Accolades: [{ Type: "Belt", Name: "UFC Welterweight Title" }],
  RuleSet: { PossibleRounds: 5 },
  Fighters: [
    {
      FighterId: 2466,
      Name: { FirstName: "Islam", LastName: "Makhachev" },
      Corner: "Red",
      Outcome: { Outcome: "Win" },
    },
    {
      FighterId: 3717,
      Name: { FirstName: "Ian", LastName: "Machado Garry" },
      Corner: "Blue",
      Outcome: { Outcome: "Loss" },
    },
  ],
  Result: { Method: "Decision - Unanimous", EndingRound: 5 },
};

describe("ufc-live-api", () => {
  it("discovers the API event ID from the UFC event page", () => {
    expect(
      extractUfcLiveEventId(
        '<script>{"eventLiveStats":{"event_fmid":"1317"}}</script>',
      ),
    ).toBe("1317");
    expect(
      extractUfcLiveEventId(
        '<div id="c-listing-ticker" data-fmid="1323"></div>',
      ),
    ).toBe("1323");
    expect(buildUfcLiveEventUrl("1317")).toBe(
      "https://d29dxerjsp82wz.cloudfront.net/api/v3/event/live/1317.json",
    );
  });

  it("normalizes timing, status, card metadata and final results", () => {
    const parsed = parseUfcLiveEventPayload({
      LiveEventDetail: {
        EventId: 1317,
        Name: "UFC 330: Makhachev vs. Machado Garry",
        StartTime: "2026-08-15T21:30Z",
        TimeZone: "GMT-04:00",
        Status: "Completed",
        Location: {
          Venue: "T-Mobile Arena",
          City: "Las Vegas",
          State: "Nevada",
          Country: "United States",
        },
        FightCard: [
          fight,
          {
            ...fight,
            FightId: 13010,
            FightOrder: 6,
            CardSegment: "Prelims2",
            CardSegmentStartTime: "2026-08-15T21:30Z",
            Accolades: [],
            RuleSet: { PossibleRounds: 3 },
            Fighters: [
              {
                FighterId: 1,
                Name: { FirstName: "Fighter", LastName: "One" },
                Corner: "Red",
                Outcome: { Outcome: null },
              },
              {
                FighterId: 2,
                Name: { FirstName: "Fighter", LastName: "Two" },
                Corner: "Blue",
                Outcome: { Outcome: null },
              },
            ],
            Result: { Method: null, EndingRound: null },
            Status: "Live",
            FightNightTracking: [
              {
                ActionId: 10,
                Type: "round_start",
                RoundNumber: 2,
                RoundTime: "5:00",
                Timestamp: "2026-08-15T22:10:00Z",
              },
            ],
          },
        ],
      },
    });

    expect(parsed).toMatchObject({
      eventId: "1317",
      status: "completed",
      startTime: "2026-08-15T21:30:00.000Z",
      timeZone: "GMT-04:00",
      prelimsStartAt: "2026-08-15T21:30:00.000Z",
      location: "T-Mobile Arena, Las Vegas, Nevada, United States",
      results: [
        {
          winner: "Islam Makhachev",
          loser: "Ian Machado Garry",
          method: "decision",
          round: 5,
        },
      ],
    });
    expect(parsed?.fights[0]).toMatchObject({
      fightId: "12910",
      cardType: "main",
      isTitleFight: true,
      totalRounds: 5,
      phase: "completed",
    });
    expect(parsed?.fights[1]).toMatchObject({
      phase: "live",
      currentRound: 2,
      roundTime: "5:00",
      latestActionAt: "2026-08-15T22:10:00.000Z",
    });
    expect(
      new Date(parsed!.startTime!).getTime() - 30 * 60 * 1000,
    ).toBe(new Date("2026-08-15T21:00:00.000Z").getTime());
    expect(
      buildUfcAutomaticTimingUpdate(
        { timing_mode: "automatic", picks_open_at: null },
        parsed!,
      ),
    ).toEqual({
      event_date: "2026-08-15T21:30:00.000Z",
      prelims_start_at: "2026-08-15T21:30:00.000Z",
      picks_lock_at: "2026-08-15T21:00:00.000Z",
      picks_open_at: "2026-08-15T09:30:00.000Z",
      status: "completed",
    });
    expect(
      buildUfcAutomaticTimingUpdate({ timing_mode: "manual" }, parsed!),
    ).toBeNull();
  });

  it("keeps an upcoming event resultless", () => {
    const parsed = parseUfcLiveEventPayload({
      LiveEventDetail: {
        EventId: 1323,
        Name: "UFC Fight Night",
        StartTime: "2026-08-22T21:00Z",
        Status: "Upcoming",
        FightCard: [],
      },
    });

    expect(parsed).toMatchObject({ status: "upcoming", results: [] });
  });

  it("reads five rounds from RuleSet for a non-title fight", () => {
    const parsed = parseUfcLiveEventPayload({
      LiveEventDetail: {
        EventId: 1324,
        FightCard: [
          {
            ...fight,
            Accolades: [],
            WeightClass: {
              Description: "Women's Lightweight",
              CatchWeight: null,
            },
            RuleSet: {
              PossibleRounds: 5,
              Description: "5 Rnd (5-5-5-5-5)",
            },
          },
        ],
      },
    });

    expect(parsed?.fights[0]).toMatchObject({
      isTitleFight: false,
      weightClass: "Lightweight",
      totalRounds: 5,
    });
  });
});
