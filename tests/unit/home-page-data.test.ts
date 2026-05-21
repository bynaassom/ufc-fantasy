import type { Event, Profile } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentPublicEvent: vi.fn(),
  listUpcomingAndCompletedEvents: vi.fn(),
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

vi.mock("@/server/repositories/events", () => ({
  createEvent: vi.fn(),
  findEventById: vi.fn(),
  findEventBySlugForPickValidation: vi.fn(),
  findEventBySlugWithFights: vi.fn(),
  getCurrentPublicEvent: mocks.getCurrentPublicEvent,
  listCompletedEvents: vi.fn(),
  listRecentEvents: vi.fn(),
  listUpcomingAndCompletedEvents: mocks.listUpcomingAndCompletedEvents,
  updateEvent: vi.fn(),
}));

function makeEvent(overrides: Partial<Event>): Event {
  return {
    id: "event-id",
    name: "UFC Test",
    slug: "ufc-test",
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

    mocks.requirePageUserProfile.mockResolvedValue({
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
  });

  it("shows the current upcoming event even when the mixed event list is filled by completed events", async () => {
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
    mocks.listUpcomingAndCompletedEvents.mockResolvedValue(completedEvents);

    const { getHomePageData } = await import("@/server/services/app");

    await expect(getHomePageData()).resolves.toMatchObject({
      currentEvent: {
        id: "ufc-326",
        name: "UFC 326",
      },
    });
    expect(mocks.getCurrentPublicEvent).toHaveBeenCalledOnce();
  });
});
