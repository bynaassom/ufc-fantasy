import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRpc = vi.fn();
const mockUpsert = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: vi.fn(() => ({})) }));
const mockInsert = vi.fn();

const mockClient: any = {
  from: vi.fn(),
  rpc: mockRpc,
};

vi.mock("@/lib/supabase/service-role", () => ({
  getServiceRoleSupabase: vi.fn(() => Promise.resolve(mockClient)),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mockUpsert.mockReturnValue({ select: () => ({ maybeSingle: mockMaybeSingle }) });
  mockSelect.mockReturnValue({ eq: () => ({ order: () => ({ limit: mockLimit }), single: mockSingle }) });
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockSingle.mockResolvedValue({ data: { xp_total: 0, best_streak: 0, level: 1 }, error: null });
  mockMaybeSingle.mockResolvedValue({ data: { id: "x1" }, error: null });
  mockRpc.mockResolvedValue({ error: null });
  mockInsert.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: vi.fn(() => ({})) });
});

describe("xp service - computeEventXpForUser", () => {
  it("returns null when the user has no picks for the event", async () => {
    mockClient.from.mockReturnValueOnce({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }),
    });
    const { computeEventXpForUser } = await import("@/server/services/xp");
    const result = await computeEventXpForUser(mockClient, "u1", "e1");
    expect(result).toBeNull();
  });

  it("computes the canonical example: 8 fights, 6 winners, 4 methods, 3 rounds", async () => {
    const picks = Array.from({ length: 8 }, (_, i) => ({
      fight_id: `f${i}`,
      winner_id: i < 6 ? "w" : null,
      method: i < 4 ? "ko" : null,
      round: i < 3 ? 1 : null,
      points_winner: i < 6 ? 10 : 0,
      points_method: i < 4 ? 5 : 0,
      points_round: i < 3 ? 3 : 0,
    }));
    mockClient.from.mockReturnValueOnce({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: picks, error: null }) }) }),
    });
    const { computeEventXpForUser } = await import("@/server/services/xp");
    const result = await computeEventXpForUser(mockClient, "u1", "e1");
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(159);
    expect(result!.metadata.accuracy).toBe(0.75);
    expect(result!.metadata.method_acc).toBe(0.5);
    expect(result!.metadata.round_acc).toBeCloseTo(0.375);
  });

  it("returns 100 XP for 0 correct out of 8 (participation only)", async () => {
    const picks = Array.from({ length: 8 }, () => ({
      fight_id: "f", winner_id: null, method: null, round: null,
      points_winner: 0, points_method: 0, points_round: 0,
    }));
    mockClient.from.mockReturnValueOnce({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: picks, error: null }) }) }),
    });
    const { computeEventXpForUser } = await import("@/server/services/xp");
    const result = await computeEventXpForUser(mockClient, "u1", "e1");
    expect(result!.amount).toBe(100);
  });

  it("returns 200 XP for a perfect 8/8", async () => {
    const picks = Array.from({ length: 8 }, () => ({
      fight_id: "f", winner_id: "w", method: "ko", round: 1,
      points_winner: 10, points_method: 5, points_round: 3,
    }));
    mockClient.from.mockReturnValueOnce({
      select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: picks, error: null }) }) }),
    });
    const { computeEventXpForUser } = await import("@/server/services/xp");
    const result = await computeEventXpForUser(mockClient, "u1", "e1");
    expect(result!.amount).toBe(200);
  });
});

describe("xp service - awardEventXpForAllUsers", () => {
  it("returns 0/[] when no picks exist for the event", async () => {
    mockClient.from
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { name: "Event", slug: "event" }, error: null }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) });
    const { awardEventXpForAllUsers } = await import("@/server/services/xp");
    const r = await awardEventXpForAllUsers("e1");
    expect(r).toEqual({ awarded: 0, usersAffected: [] });
  });

  it("awards XP to each unique user and recomputes streak", async () => {
    const pickers = [{ user_id: "u1" }, { user_id: "u2" }];
    const picksForU1 = [{ fight_id: "f1", winner_id: "w", method: "ko", round: 1, points_winner: 10, points_method: 5, points_round: 3 }];
    const eventsForU1 = [{ metadata: { accuracy: 1, method_acc: 1, round_acc: 1, fights_with_picks: 1, correct_winners: 1, correct_methods: 1, correct_rounds: 1 }, created_at: "2026-06-01" }];

    mockClient.from
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { name: "Event", slug: "event" }, error: null }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => Promise.resolve({ data: pickers, error: null }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: picksForU1, error: null }) }) }) })
      .mockReturnValueOnce({ upsert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "x" }, error: null }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: picksForU1, error: null }) }) }) })
      .mockReturnValueOnce({ upsert: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "y" }, error: null }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: eventsForU1, error: null }) }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { xp_total: 200, best_streak: 5, level: 1 }, error: null }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { xp_total: 200, best_streak: 5, level: 1 }, error: null }) }) }) });

    const { awardEventXpForAllUsers } = await import("@/server/services/xp");
    const r = await awardEventXpForAllUsers("e1");
    expect(r.usersAffected.length).toBeGreaterThan(0);
  });
});
