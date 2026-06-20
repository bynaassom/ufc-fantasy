import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createChallengeSchema } from "@/server/validators/challenges";

function mockSupabaseClient() {
  const query = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
    data: null,
    error: null,
  };

  return {
    from: vi.fn(() => query),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

const mocks = vi.hoisted(() => ({
  requireActiveUser: vi.fn(),
  getAdminSupabase: vi.fn(),
  createChallenge: vi.fn(),
  findEventById: vi.fn(),
  getCurrentPublicEvent: vi.fn(),
  findPublicProfilesByIds: vi.fn(),
  findActiveChallengeBetweenUsers: vi.fn(),
  createNotification: vi.fn(),
  logActivity: vi.fn(),
  getProfileXpSummary: vi.fn(),
  listPushSubscriptionsForUsers: vi.fn(),
  shouldNotifyUser: vi.fn(),
  sendBrowserPush: vi.fn(),
  getNotificationPreferenceKey: vi.fn(),
}));

vi.mock("@/server/auth/guards", () => ({
  requireActiveUser: mocks.requireActiveUser,
  requireAdmin: vi.fn(),
}));

vi.mock("@/server/supabase", () => ({
  getAdminSupabase: mocks.getAdminSupabase,
  getUserSupabase: vi.fn(),
}));

vi.mock("@/server/repositories/challenges", () => ({
  createChallenge: mocks.createChallenge,
  findActiveChallengeBetweenUsers: mocks.findActiveChallengeBetweenUsers,
  findChallengeById: vi.fn(),
  listChallengesForProfile: vi.fn(),
  listChallengesForUser: vi.fn(),
  updateChallenge: vi.fn(),
}));

vi.mock("@/server/repositories/events", () => ({
  findEventById: mocks.findEventById,
  getCurrentPublicEvent: mocks.getCurrentPublicEvent,
  findEventBySlugWithFights: vi.fn(),
  findEventBySlugForPickValidation: vi.fn(),
  listUpcomingEvents: vi.fn(),
  listCompletedEvents: vi.fn(),
  listRecentCompletedEvents: vi.fn(),
  listAdminEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

vi.mock("@/server/repositories/profiles", () => ({
  findPublicProfilesByIds: mocks.findPublicProfilesByIds,
  findProfileById: vi.fn(),
  findPublicProfileByNickname: vi.fn(),
  listPublicProfiles: vi.fn(),
  listRecentProfiles: vi.fn(),
  updateProfile: vi.fn(),
  updateProfileBan: vi.fn(),
  updateProfileRole: vi.fn(),
}));

vi.mock("@/server/repositories/notifications", () => ({
  createNotification: mocks.createNotification,
  shouldNotifyUser: mocks.shouldNotifyUser,
  listNotificationsForUser: vi.fn(),
  listActiveNotificationRecipients: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  markNotificationAsRead: vi.fn(),
  countUnreadNotifications: vi.fn(),
}));

vi.mock("@/server/repositories/push-subscriptions", () => ({
  listPushSubscriptionsForUsers: mocks.listPushSubscriptionsForUsers,
  deletePushSubscriptionByEndpoint: vi.fn(),
}));

vi.mock("@/server/services/notifications", () => ({
  notifyActiveUsers: vi.fn(),
  createNotificationsForUsers: vi.fn(),
  sendBrowserPush: mocks.sendBrowserPush,
}));

vi.mock("@/server/services/activity", () => ({
  logActivity: mocks.logActivity,
}));

vi.mock("@/lib/notifications", () => ({
  getNotificationPreferenceKey: mocks.getNotificationPreferenceKey,
}));

vi.mock("@/server/services/xp", () => ({
  getProfileXpSummary: mocks.getProfileXpSummary,
  getEventXpForUser: vi.fn(),
}));

vi.mock("@/server/services/page-auth", () => ({
  requirePageUserProfile: vi.fn(),
  requireActiveUserProfile: vi.fn(),
  requireAdminPageProfile: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: any[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleSupabase: vi.fn(() => ({})),
}));

const user = { id: "user-1" };
const opponent = { id: "user-2", nickname: "opponent", first_name: "", last_name: "", total_points: 0 };
const event = { id: "event-1", name: "UFC 300", slug: "ufc-300" };

function setupMocks() {
  mocks.requireActiveUser.mockResolvedValue({ user, supabase: {}, profile: {} });
  mocks.getAdminSupabase.mockResolvedValue(mockSupabaseClient());
  mocks.findEventById.mockResolvedValue(event);
  mocks.getCurrentPublicEvent.mockResolvedValue(event);
  mocks.findPublicProfilesByIds.mockResolvedValue([opponent]);
  mocks.findActiveChallengeBetweenUsers.mockResolvedValue(null);
  mocks.createChallenge.mockResolvedValue({
    id: "challenge-1",
    event_id: event.id,
    challenger_id: user.id,
    challenged_id: opponent.id,
    status: "pending",
    template_type: null,
    winner_user_id: null,
    responded_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  mocks.createNotification.mockResolvedValue({ id: "notif-1" });
  mocks.shouldNotifyUser.mockResolvedValue(true);
  mocks.getNotificationPreferenceKey.mockReturnValue("challenge_received");
  mocks.listPushSubscriptionsForUsers.mockResolvedValue([]);
  mocks.logActivity.mockResolvedValue(null);
  mocks.getProfileXpSummary.mockResolvedValue({
    xpTotal: 0,
    level: 1,
    levelTitle: "Rookie",
    currentStreak: 0,
    bestStreak: 0,
    nextLevelXp: 500,
    progressToNextLevel: 0,
  });
}

describe("challenge templates", () => {
  describe("validator", () => {
    it("accepts valid template type beat_my_score", () => {
      const result = createChallengeSchema.safeParse({
        challengedId: "11111111-1111-4111-8111-111111111111",
        eventId: "22222222-2222-4222-8222-222222222222",
        template: "beat_my_score",
      });

      expect(result.success).toBe(true);
    });

    it("accepts valid template type more_winners", () => {
      const result = createChallengeSchema.safeParse({
        challengedId: "11111111-1111-4111-8111-111111111111",
        eventId: "22222222-2222-4222-8222-222222222222",
        template: "more_winners",
      });

      expect(result.success).toBe(true);
    });

    it("accepts valid template type use_my_picks", () => {
      const result = createChallengeSchema.safeParse({
        challengedId: "11111111-1111-4111-8111-111111111111",
        eventId: "22222222-2222-4222-8222-222222222222",
        template: "use_my_picks",
      });

      expect(result.success).toBe(true);
    });

    it("creates manual challenge without template (null)", () => {
      const result = createChallengeSchema.safeParse({
        challengedId: "11111111-1111-4111-8111-111111111111",
        eventId: "22222222-2222-4222-8222-222222222222",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.template).toBeUndefined();
      }
    });

    it("rejects invalid template type", () => {
      const result = createChallengeSchema.safeParse({
        challengedId: "11111111-1111-4111-8111-111111111111",
        eventId: "22222222-2222-4222-8222-222222222222",
        template: "invalid_type",
      });

      expect(result.success).toBe(false);
    });

    it("rejects template type that is not in enum", () => {
      const result = createChallengeSchema.safeParse({
        challengedId: "11111111-1111-4111-8111-111111111111",
        eventId: "22222222-2222-4222-8222-222222222222",
        template: "random_string",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("createUserChallenge with template", () => {
    beforeEach(async () => {
      vi.resetModules();
      setupMocks();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("passes template_type to createChallenge when template is provided", async () => {
      const { createUserChallenge } = await import("@/server/services/app");

      await createUserChallenge(
        opponent.id,
        event.id,
        "beat_my_score",
      );

      expect(mocks.createChallenge).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          template_type: "beat_my_score",
        }),
      );
    });

    it("passes null template_type when template is not provided", async () => {
      const { createUserChallenge } = await import("@/server/services/app");

      await createUserChallenge(opponent.id, event.id);

      expect(mocks.createChallenge).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          template_type: null,
        }),
      );
    });

    it("passes template_type as null when template is not provided (undefined)", async () => {
      const { createUserChallenge } = await import("@/server/services/app");

      await createUserChallenge(
        opponent.id,
        event.id,
        undefined,
      );

      expect(mocks.createChallenge).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          template_type: null,
        }),
      );
    });
  });
});
