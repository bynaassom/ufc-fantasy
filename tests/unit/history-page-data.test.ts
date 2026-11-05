const mocks = vi.hoisted(() => ({
  requirePageUserProfile: vi.fn(),
  findEventBySlugWithFights: vi.fn(),
  listPicksForUserEvent: vi.fn(),
  listPicksForUser: vi.fn(() => { throw new Error("Unbounded history read"); }),
}));

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleSupabase: vi.fn(() => ({})),
}));
vi.mock("@/server/services/page-auth", () => ({
  requirePageUserProfile: mocks.requirePageUserProfile,
}));
vi.mock("@/server/repositories/events", () => ({
  findEventBySlugWithFights: mocks.findEventBySlugWithFights,
  getCurrentPublicEvent: vi.fn(),
}));
vi.mock("@/server/repositories/picks", () => ({
  listPicksForUserEvent: mocks.listPicksForUserEvent,
  listPicksForUser: mocks.listPicksForUser,
}));

import { getHistoryEventPageData } from "@/server/services/app";

describe("event history reads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads only the signed-in user's picks and score for the requested event", async () => {
    const score = { total_points: 9, perfect_picks: 2 };
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: score, error: null }),
    };
    const supabase = { from: vi.fn(() => query) };
    const profile = { id: "user-1" };
    const event = { id: "event-2", slug: "second-event" };
    const picks = [{ id: "pick-1", event_id: event.id, user_id: profile.id }];
    mocks.requirePageUserProfile.mockResolvedValue({ supabase, user: profile, profile });
    mocks.findEventBySlugWithFights.mockResolvedValue(event);
    mocks.listPicksForUserEvent.mockResolvedValue(picks);

    await expect(getHistoryEventPageData(event.slug)).resolves.toEqual({
      profile, event, picks, score,
    });
    expect(mocks.listPicksForUserEvent).toHaveBeenCalledWith(supabase, profile.id, event.id);
    expect(mocks.listPicksForUser).not.toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith("user_id", profile.id);
    expect(query.eq).toHaveBeenCalledWith("event_id", event.id);
  });

  it("does not query personal history when the event does not exist", async () => {
    const supabase = { from: vi.fn() };
    const profile = { id: "user-1" };
    mocks.requirePageUserProfile.mockResolvedValue({ supabase, user: profile, profile });
    mocks.findEventBySlugWithFights.mockResolvedValue(null);

    await expect(getHistoryEventPageData("missing-event")).resolves.toEqual({
      profile, event: null, picks: [], score: null,
    });
    expect(mocks.listPicksForUserEvent).not.toHaveBeenCalled();
    expect(mocks.listPicksForUser).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
