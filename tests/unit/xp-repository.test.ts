import { describe, it, expect, vi, beforeEach } from "vitest";

const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();
const mockRpc = vi.fn();
const mockUpdate = vi.fn();

const mockClient: any = {
  from: vi.fn(() => ({
    upsert: mockUpsert,
    select: mockSelect,
    update: mockUpdate,
  })),
  rpc: mockRpc,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUpsert.mockReturnValue({ select: () => ({ maybeSingle: mockMaybeSingle }) });
  mockSelect.mockReturnValue({ eq: mockEq, order: () => ({ limit: mockLimit }) });
  mockEq.mockReturnValue({ order: mockOrder });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockUpdate.mockReturnValue({ eq: () => ({}) });
  mockLimit.mockResolvedValue({ data: [], error: null });
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockRpc.mockResolvedValue({ error: null });
});

describe("xp repository", () => {
  it("insertXpEvent calls upsert with the unique conflict target", async () => {
    const { insertXpEvent } = await import("@/server/repositories/xp");
    await insertXpEvent(mockClient, {
      userId: "u1",
      eventId: "e1",
      amount: 100,
      reason: "event_completion",
      metadata: {
        accuracy: 0.75,
        method_acc: 0.5,
        round_acc: 0.375,
        fights_with_picks: 8,
        correct_winners: 6,
        correct_methods: 4,
        correct_rounds: 3,
      },
    });
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "u1",
        event_id: "e1",
        amount: 100,
        reason: "event_completion",
      }),
      { onConflict: "user_id,event_id,reason", ignoreDuplicates: true },
    );
  });

  it("listXpEventsForUser queries with DESC ordering and limit", async () => {
    const { listXpEventsForUser } = await import("@/server/repositories/xp");
    await listXpEventsForUser(mockClient, "u1", 10);
    expect(mockClient.from).toHaveBeenCalledWith("xp_events");
    expect(mockEq).toHaveBeenCalledWith("user_id", "u1");
    expect(mockOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it("incrementProfileXp calls the rpc with the amount", async () => {
    const { incrementProfileXp } = await import("@/server/repositories/xp");
    await incrementProfileXp(mockClient, "u1", 159);
    expect(mockRpc).toHaveBeenCalledWith("increment_profile_xp", {
      p_user_id: "u1",
      p_amount: 159,
    });
  });

  it("incrementProfileXp is a no-op for zero amount", async () => {
    const { incrementProfileXp } = await import("@/server/repositories/xp");
    await incrementProfileXp(mockClient, "u1", 0);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("updateProfileStreak calls the rpc with both streaks", async () => {
    const { updateProfileStreak } = await import("@/server/repositories/xp");
    await updateProfileStreak(mockClient, "u1", 5, 12);
    expect(mockRpc).toHaveBeenCalledWith("update_profile_streak", {
      p_user_id: "u1",
      p_current_streak: 5,
      p_best_streak: 12,
    });
  });
});
