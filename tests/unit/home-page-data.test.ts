import type { Event, Profile } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentPublicEvent: vi.fn(),
  listActiveBonusEvents: vi.fn(),
  listRecentCompletedEvents: vi.fn(),
  listUpcomingEvents: vi.fn(),
  listChallengesForUser: vi.fn(),
  findPublicProfilesByIds: vi.fn(),
  listPicksForUserEvent: vi.fn(),
  countFightsForEvent: vi.fn(),
  getAdminSupabase: vi.fn(),
  requirePageUserProfile: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: any[]) => unknown) => fn,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleSupabase: vi.fn(() => ({})),
}));

vi.mock("@/server/services/page-auth", () => ({
  requireActiveUserProfile: vi.fn(),
  requireAdminPageProfile: vi.fn(),
  requirePageUserProfile: mocks.requirePageUserProfile,
}));

vi.mock("@/server/supabase", () => ({
  getAdminSupabase: mocks.getAdminSupabase,
  getUserSupabase: vi.fn(),
}));

vi.mock("@/server/repositories/challenges", () => ({
  createChallenge: vi.fn(),
  findActiveChallengeBetweenUsers: vi.fn(),
  findChallengeById: vi.fn(),
  listChallengesForProfile: vi.fn(),
  listChallengesForUser: mocks.listChallengesForUser,
  updateChallenge: vi.fn(),
}));

vi.mock("@/server/repositories/profiles", () => ({
  findPublicProfileByNickname: vi.fn(),
  findPublicProfilesByIds: mocks.findPublicProfilesByIds,
  listPublicProfiles: vi.fn(),
  listRecentProfiles: vi.fn(),
  updateProfile: vi.fn(),
  updateProfileBan: vi.fn(),
  updateProfileRole: vi.fn(),
}));

vi.mock("@/server/repositories/picks", () => ({
  listPicksForUserEvent: mocks.listPicksForUserEvent,
}));

vi.mock("@/server/repositories/stats", () => ({
  countFightsForEvent: mocks.countFightsForEvent,
}));

vi.mock("@/server/repositories/events", () => ({
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  findEventById: vi.fn(),
  findEventBySlugForPickValidation: vi.fn(),
  findEventBySlugWithFights: vi.fn(),
  getCurrentPublicEvent: mocks.getCurrentPublicEvent,
  listActiveBonusEvents: mocks.listActiveBonusEvents,
  listCompletedEvents: vi.fn(),
  listRecentEvents: vi.fn(),
  listRecentCompletedEvents: mocks.listRecentCompletedEvents,
  listUpcomingEvents: mocks.listUpcomingEvents,
  updateEvent: vi.fn(),
}));

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "event-id",
    name: "UFC Test",
    slug: "ufc-test",
    is_bonus: false,
    event_date: "2026-06-20T23:00:00.000Z",
    location: "Las Vegas, NV",
    banner_image_url: undefined,
    ufc_event_id: undefined,
    status: "upcoming",
    picks_lock_at: "2026-06-20T20:00:00.000Z",
    picks_open_at: null,
    ufc_stats_url: null,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getHomePageData", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-03T12:00:00.000Z"));

    mocks.requirePageUserProfile.mockResolvedValue({
      user: { id: "profile-id" },
      profile: {
        id: "profile-id",
        nickname: "name",
        first_name: "",
        last_name: "",
        role: "user",
        is_banned: false,
        total_points: 108,
        division: "Lightweight",
        division_confirmed: true,
        created_at: "2026-05-01T00:00:00.000Z",
        updated_at: "2026-05-01T00:00:00.000Z",
      } satisfies Partial<Profile>,
    });
    mocks.listRecentCompletedEvents.mockResolvedValue([]);
    mocks.listActiveBonusEvents.mockResolvedValue([]);
    mocks.listUpcomingEvents.mockResolvedValue([]);
    mocks.listChallengesForUser.mockResolvedValue([]);
    mocks.findPublicProfilesByIds.mockResolvedValue([]);
    mocks.listPicksForUserEvent.mockResolvedValue([]);
    mocks.countFightsForEvent.mockResolvedValue(12);
    mocks.getAdminSupabase.mockResolvedValue({ client: "admin" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the current upcoming event alongside recent completed events", async () => {
    const currentEvent = makeEvent({
      id: "ufc-326",
      name: "UFC 326",
      slug: "ufc-326",
      status: "upcoming",
      event_date: "2026-06-27T23:00:00.000Z",
    });
    const completedEvents = Array.from({ length: 10 }, (_, index) =>
      makeEvent({
        id: `completed-${index}`,
        name: `Completed ${index}`,
        slug: `completed-${index}`,
        status: "completed",
        event_date: `2025-01-${String(index + 1).padStart(2, "0")}T23:00:00.000Z`,
      }),
    );

    mocks.getCurrentPublicEvent.mockResolvedValue(currentEvent);
    mocks.listRecentCompletedEvents.mockResolvedValue(completedEvents);

    const { getHomePageData } = await import("@/server/services/app");

    await expect(getHomePageData()).resolves.toMatchObject({
      currentEvent: {
        id: "ufc-326",
        name: "UFC 326",
      },
      currentEventPickProgress: {
        picked: 0,
        total: 12,
      },
    });
    expect(mocks.getCurrentPublicEvent).toHaveBeenCalledOnce();
  });

  it("promotes the next event when the previous upcoming event has expired", async () => {
    const expiredEvent = makeEvent({
      id: "expired-event",
      name: "Expired event",
      slug: "expired-event",
      event_date: "2026-05-30T02:00:00.000Z",
    });
    const nextEvent = makeEvent({
      id: "next-event",
      name: "Next event",
      slug: "next-event",
      event_date: "2026-06-07T00:00:00.000Z",
    });
    const laterEvent = makeEvent({
      id: "later-event",
      name: "Later event",
      slug: "later-event",
      event_date: "2026-06-15T00:00:00.000Z",
    });

    mocks.getCurrentPublicEvent.mockResolvedValue(expiredEvent);
    mocks.listUpcomingEvents.mockResolvedValue([
      expiredEvent,
      nextEvent,
      laterEvent,
    ]);

    const { getHomePageData } = await import("@/server/services/app");
    const result = await getHomePageData();

    expect(result.currentEvent?.id).toBe("next-event");
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["later-event"]);
  });

  it("keeps the main weekend event in the hero and exposes bonus picks separately", async () => {
    const bonusEvent = makeEvent({
      id: "road-to-ufc-5-3",
      name: "Road To UFC 5.3",
      slug: "road-to-ufc-5-3",
      is_bonus: true,
      event_date: "2026-06-06T12:00:00.000Z",
    });
    const mainEvent = makeEvent({
      id: "nurmagomedov-vs-song",
      name: "UFC Fight Night: Nurmagomedov vs Song",
      slug: "ufc-fight-night-nurmagomedov-vs-song",
      event_date: "2026-06-07T00:00:00.000Z",
    });

    mocks.getCurrentPublicEvent.mockResolvedValue(mainEvent);
    mocks.listUpcomingEvents.mockResolvedValue([bonusEvent, mainEvent]);
    mocks.listActiveBonusEvents.mockResolvedValue([bonusEvent]);

    const { getHomePageData } = await import("@/server/services/app");
    const result = await getHomePageData();

    expect(result.currentEvent?.id).toBe("nurmagomedov-vs-song");
    expect(result.bonusEvents.map((event) => event.id)).toEqual([
      "road-to-ufc-5-3",
    ]);
    expect(result.upcomingEvents).toEqual([]);
  });

  it("loads upcoming events independently from the completed event list", async () => {
    const currentEvent = makeEvent({
      id: "current-event",
      name: "Current event",
      slug: "current-event",
      event_date: "2026-06-07T00:00:00.000Z",
    });
    const laterEvent = makeEvent({
      id: "later-event",
      name: "Later event",
      slug: "later-event",
      event_date: "2026-06-15T00:00:00.000Z",
    });
    const completedEvents = Array.from({ length: 10 }, (_, index) =>
      makeEvent({
        id: `completed-${index}`,
        name: `Completed ${index}`,
        slug: `completed-${index}`,
        status: "completed",
        event_date: `2026-05-${String(index + 1).padStart(2, "0")}T23:00:00.000Z`,
      }),
    );

    mocks.getCurrentPublicEvent.mockResolvedValue(currentEvent);
    mocks.listUpcomingEvents.mockResolvedValue([currentEvent, laterEvent]);
    mocks.listRecentCompletedEvents.mockResolvedValue(completedEvents);

    const { getHomePageData } = await import("@/server/services/app");
    const result = await getHomePageData();

    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["later-event"]);
    expect(result.previousEvents).toHaveLength(6);
    expect(mocks.listUpcomingEvents).toHaveBeenCalledOnce();
    expect(mocks.listRecentCompletedEvents).toHaveBeenCalledOnce();
  });

  it("loads the events index without fetching completed events or home-only data", async () => {
    const currentEvent = makeEvent({
      id: "current-event",
      slug: "current-event",
      event_date: "2026-06-07T00:00:00.000Z",
    });
    const laterEvent = makeEvent({
      id: "later-event",
      slug: "later-event",
      event_date: "2026-06-15T00:00:00.000Z",
    });
    mocks.getCurrentPublicEvent.mockResolvedValue(currentEvent);
    mocks.listUpcomingEvents.mockResolvedValue([currentEvent, laterEvent]);

    const { getEventsIndexPageData } = await import("@/server/services/app");
    const result = await getEventsIndexPageData();

    expect(result.currentEvent?.id).toBe("current-event");
    expect(result.upcomingEvents.map((event) => event.id)).toEqual(["later-event"]);
    expect(mocks.listUpcomingEvents).toHaveBeenCalledWith({}, 50);
    expect(mocks.listRecentCompletedEvents).not.toHaveBeenCalled();
    expect(mocks.listChallengesForUser).not.toHaveBeenCalled();
  });
});
