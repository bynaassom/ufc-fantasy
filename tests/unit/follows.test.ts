import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDelete = vi.fn();
const mockInsert = vi.fn();
const mockRpc = vi.fn();

function createQuery(result: Record<string, unknown>) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(() => query),
    delete: mockDelete,
    insert: mockInsert,
    then: (resolve: (value: Record<string, unknown>) => unknown) =>
      Promise.resolve(result).then(resolve),
  };

  return query;
}

describe("follows repository", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("isFollowing returns true when relation exists", async () => {
    const query = createQuery({ data: { id: "f1" }, error: null });
    const client: any = { from: vi.fn(() => query) };
    const actual = await vi.importActual<typeof import("@/server/repositories/follows")>(
      "@/server/repositories/follows",
    );
    const { isFollowing } = actual;

    const result = await isFollowing(client, "user-1", "user-2");

    expect(result).toBe(true);
    expect(client.from).toHaveBeenCalledWith("user_follows");
    expect(query.select).toHaveBeenCalledWith("id");
    expect(query.eq).toHaveBeenCalledWith("follower_id", "user-1");
    expect(query.eq).toHaveBeenCalledWith("following_id", "user-2");
  });

  it("isFollowing returns false when relation does not exist", async () => {
    const query = createQuery({ data: null, error: null });
    const client: any = { from: vi.fn(() => query) };
    const actual = await vi.importActual<typeof import("@/server/repositories/follows")>(
      "@/server/repositories/follows",
    );
    const { isFollowing } = actual;

    const result = await isFollowing(client, "user-1", "user-2");

    expect(result).toBe(false);
  });

  it("followUser throws on self-follow", async () => {
    const client: any = { from: vi.fn() };
    const actual = await vi.importActual<typeof import("@/server/repositories/follows")>(
      "@/server/repositories/follows",
    );
    const { followUser } = actual;

    await expect(followUser(client, "user-1", "user-1")).rejects.toThrow(
      "Cannot follow yourself",
    );
  });

  it("followUser is idempotent on duplicate", async () => {
    mockInsert.mockResolvedValueOnce({ error: { code: "23505" } });
    const client: any = { from: vi.fn(() => ({ insert: mockInsert })), rpc: mockRpc };
    const actual = await vi.importActual<typeof import("@/server/repositories/follows")>(
      "@/server/repositories/follows",
    );
    const { followUser } = actual;

    await expect(followUser(client, "user-1", "user-2")).resolves.toBeUndefined();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("followUser inserts and calls rpc on success", async () => {
    mockInsert.mockResolvedValueOnce({ error: null });
    mockRpc.mockResolvedValueOnce({ error: null });
    const client: any = { from: vi.fn(() => ({ insert: mockInsert })), rpc: mockRpc };
    const actual = await vi.importActual<typeof import("@/server/repositories/follows")>(
      "@/server/repositories/follows",
    );
    const { followUser } = actual;

    await followUser(client, "user-1", "user-2");

    expect(mockInsert).toHaveBeenCalledWith({
      follower_id: "user-1",
      following_id: "user-2",
    });
    expect(mockRpc).toHaveBeenCalledWith("update_follow_counters", {
      p_follower_id: "user-1",
      p_following_id: "user-2",
      p_increment: true,
    });
  });

  it("unfollowUser deletes and updates counters", async () => {
    mockDelete.mockReturnValueOnce({ eq: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) });
    mockRpc.mockResolvedValueOnce({ error: null });
    const client: any = { from: vi.fn(() => ({ delete: mockDelete })), rpc: mockRpc };
    const actual = await vi.importActual<typeof import("@/server/repositories/follows")>(
      "@/server/repositories/follows",
    );
    const { unfollowUser } = actual;

    await unfollowUser(client, "user-1", "user-2");

    expect(client.from).toHaveBeenCalledWith("user_follows");
    expect(mockRpc).toHaveBeenCalledWith("update_follow_counters", {
      p_follower_id: "user-1",
      p_following_id: "user-2",
      p_increment: false,
    });
  });

  it("listFollowers returns follower list with profile data", async () => {
    const rows = [
      {
        follower_id: "user-2",
        created_at: "2026-06-20T00:00:00Z",
        profile: { nickname: "fighter", first_name: "John", last_name: "Doe" },
      },
    ];
    const query = createQuery({ data: rows, error: null });
    const client: any = { from: vi.fn(() => query) };
    const actual = await vi.importActual<typeof import("@/server/repositories/follows")>(
      "@/server/repositories/follows",
    );
    const { listFollowers } = actual;

    const result = await listFollowers(client, "user-1", 10);

    expect(result).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith("user_follows");
    expect(query.eq).toHaveBeenCalledWith("following_id", "user-1");
    expect(query.limit).toHaveBeenCalledWith(10);
  });

  it("listFollowing returns following list with profile data", async () => {
    const rows = [
      {
        following_id: "user-2",
        created_at: "2026-06-20T00:00:00Z",
        profile: { nickname: "fighter", first_name: "John", last_name: "Doe" },
      },
    ];
    const query = createQuery({ data: rows, error: null });
    const client: any = { from: vi.fn(() => query) };
    const actual = await vi.importActual<typeof import("@/server/repositories/follows")>(
      "@/server/repositories/follows",
    );
    const { listFollowing } = actual;

    const result = await listFollowing(client, "user-1", 10);

    expect(result).toEqual(rows);
    expect(client.from).toHaveBeenCalledWith("user_follows");
    expect(query.eq).toHaveBeenCalledWith("follower_id", "user-1");
    expect(query.limit).toHaveBeenCalledWith(10);
  });
});

const mockRepoIsFollowing = vi.fn();
const mockRepoFollowUser = vi.fn();
const mockRepoUnfollowUser = vi.fn();
const mockRepoListFollowers = vi.fn();
const mockRepoListFollowing = vi.fn();
const mockSupabase = {};

vi.mock("@/server/repositories/follows", () => ({
  isFollowing: (...args: unknown[]) => mockRepoIsFollowing(...args),
  followUser: (...args: unknown[]) => mockRepoFollowUser(...args),
  unfollowUser: (...args: unknown[]) => mockRepoUnfollowUser(...args),
  listFollowers: (...args: unknown[]) => mockRepoListFollowers(...args),
  listFollowing: (...args: unknown[]) => mockRepoListFollowing(...args),
}));

vi.mock("@/server/auth/guards", () => ({
  requireActiveUser: vi.fn(() =>
    Promise.resolve({
      supabase: mockSupabase,
      user: { id: "user-1" },
      profile: { id: "user-1", nickname: "test", is_banned: false },
    }),
  ),
}));

describe("follows service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("toggleFollow calls unfollow when already following", async () => {
    mockRepoIsFollowing.mockResolvedValueOnce(true);
    const { toggleFollow } = await import("@/server/services/follows");

    const result = await toggleFollow("user-2");

    expect(mockRepoIsFollowing).toHaveBeenCalledWith(mockSupabase, "user-1", "user-2");
    expect(mockRepoUnfollowUser).toHaveBeenCalledWith(mockSupabase, "user-1", "user-2");
    expect(mockRepoFollowUser).not.toHaveBeenCalled();
    expect(result).toEqual({ following: false });
  });

  it("toggleFollow calls follow when not following", async () => {
    mockRepoIsFollowing.mockResolvedValueOnce(false);
    const { toggleFollow } = await import("@/server/services/follows");

    const result = await toggleFollow("user-2");

    expect(mockRepoIsFollowing).toHaveBeenCalledWith(mockSupabase, "user-1", "user-2");
    expect(mockRepoFollowUser).toHaveBeenCalledWith(mockSupabase, "user-1", "user-2");
    expect(mockRepoUnfollowUser).not.toHaveBeenCalled();
    expect(result).toEqual({ following: true });
  });

  it("getFollowersForUser calls listFollowers with correct args", async () => {
    mockRepoListFollowers.mockResolvedValueOnce([{ follower_id: "user-2" }]);
    const { getFollowersForUser } = await import("@/server/services/follows");

    const result = await getFollowersForUser("user-2", 5);

    expect(mockRepoListFollowers).toHaveBeenCalledWith(mockSupabase, "user-2", 5);
    expect(result).toEqual([{ follower_id: "user-2" }]);
  });

  it("getFollowingForUser calls listFollowing with correct args", async () => {
    mockRepoListFollowing.mockResolvedValueOnce([{ following_id: "user-2" }]);
    const { getFollowingForUser } = await import("@/server/services/follows");

    const result = await getFollowingForUser("user-2", 5);

    expect(mockRepoListFollowing).toHaveBeenCalledWith(mockSupabase, "user-2", 5);
    expect(result).toEqual([{ following_id: "user-2" }]);
  });
});
