import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserSupabase: vi.fn(),
  listAdminEvents: vi.fn(),
  listRecentProfiles: vi.fn(),
  requireAdminPageProfile: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: any[]) => unknown) => fn,
}));

vi.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleSupabase: vi.fn(() => ({})),
}));

vi.mock("@/server/supabase", () => ({
  getAdminSupabase: vi.fn(),
  getUserSupabase: mocks.getUserSupabase,
}));

vi.mock("@/server/services/page-auth", () => ({
  requireActiveUserProfile: vi.fn(),
  requireAdminPageProfile: mocks.requireAdminPageProfile,
  requirePageUserProfile: vi.fn(),
}));

vi.mock("@/server/repositories/events", () => ({
  createEvent: vi.fn(),
  findEventById: vi.fn(),
  findEventBySlugForPickValidation: vi.fn(),
  findEventBySlugWithFights: vi.fn(),
  getCurrentPublicEvent: vi.fn(),
  listAdminEvents: mocks.listAdminEvents,
  listCompletedEvents: vi.fn(),
  listRecentCompletedEvents: vi.fn(),
  listRecentEvents: vi.fn(),
  listUpcomingEvents: vi.fn(),
  updateEvent: vi.fn(),
}));

vi.mock("@/server/repositories/profiles", () => ({
  listPublicProfilesByDivision: vi.fn(),
  listRecentProfiles: mocks.listRecentProfiles,
}));

describe("getAdminPageData", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getUserSupabase.mockResolvedValue({ client: "user" });
    mocks.requireAdminPageProfile.mockResolvedValue({
      profile: { id: "admin", role: "admin" },
      isAdmin: true,
      user: { id: "admin" },
    });
    mocks.listAdminEvents.mockResolvedValue([]);
    mocks.listRecentProfiles.mockResolvedValue([]);
  });

  it("loads the complete event catalog for admin selectors", async () => {
    const { getAdminPageData } = await import("@/server/services/app");

    await getAdminPageData();

    expect(mocks.listAdminEvents).toHaveBeenCalledWith({ client: "user" });
  });
});
