import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabase = {};
const mockRepoInsertActivity = vi.fn();
const mockRepoListActivityForUsers = vi.fn();
const mockRepoListFollowing = vi.fn();

vi.mock("@/server/repositories/activity", () => ({
  insertActivity: (...args: unknown[]) => mockRepoInsertActivity(...args),
  listActivityForUsers: (...args: unknown[]) => mockRepoListActivityForUsers(...args),
}));

vi.mock("@/server/repositories/follows", () => ({
  listFollowing: (...args: unknown[]) => mockRepoListFollowing(...args),
}));

vi.mock("@/server/supabase", () => ({
  getAdminSupabase: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe("activity service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("logActivity silently catches errors and never throws", async () => {
    mockRepoInsertActivity.mockRejectedValueOnce(new Error("DB error"));
    const { logActivity } = await import("@/server/services/activity");

    const result = await logActivity("user-1", "pick_submitted", { fight_id: "f1" });

    expect(result).toBeUndefined();
    expect(mockRepoInsertActivity).toHaveBeenCalled();
  });

  it("getFeedForUser returns empty for user with no follows", async () => {
    mockRepoListFollowing.mockResolvedValueOnce([]);
    const { getFeedForUser } = await import("@/server/services/activity");

    const result = await getFeedForUser("user-1");

    expect(result).toEqual({ items: [], hasMore: false, nextCursor: null });
    expect(mockRepoListActivityForUsers).not.toHaveBeenCalled();
  });

  it("getFeedForUser paginates correctly", async () => {
    const now = new Date().toISOString();
    const activities = Array.from({ length: 21 }, (_, i) => ({
      id: `act-${i}`,
      user_id: i % 2 === 0 ? "user-1" : "user-2",
      type: "pick_submitted" as const,
      metadata: {},
      created_at: new Date(Date.now() - i * 1000).toISOString(),
    }));

    mockRepoListFollowing.mockResolvedValueOnce([
      { following_id: "user-2", created_at: now },
    ]);
    mockRepoListActivityForUsers.mockResolvedValueOnce({
      items: activities,
      hasMore: true,
    });

    const { getFeedForUser } = await import("@/server/services/activity");

    const result = await getFeedForUser("user-1", null, 20);

    expect(result.items).toHaveLength(21);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe(activities[20].created_at);
    expect(mockRepoListActivityForUsers).toHaveBeenCalledWith(
      mockSupabase,
      ["user-1", "user-2"],
      null,
      20,
    );
  });
});
