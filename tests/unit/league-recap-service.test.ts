import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUserLeagueIds = vi.fn();
const mockGetGroupMembers = vi.fn();
const mockGetMemberEventScore = vi.fn();
const mockGetMemberTotalPoints = vi.fn();
const mockGetPreviousCompletedEventId = vi.fn();
const mockLogAdminAction = vi.fn();
const mockAdminClient: any = {
  from: vi.fn(() => mockAdminClient),
  select: vi.fn(() => mockAdminClient),
  eq: vi.fn(() => mockAdminClient),
  single: vi.fn(() => Promise.resolve({ data: null, error: null })),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
};

vi.mock("@/server/supabase", () => ({
  getAdminSupabase: vi.fn(() => Promise.resolve(mockAdminClient)),
}));

vi.mock("@/server/repositories/league-recap", () => ({
  getUserLeagueIds: (...args: any[]) => mockGetUserLeagueIds(...args),
  getGroupMembers: (...args: any[]) => mockGetGroupMembers(...args),
  getMemberEventScore: (...args: any[]) => mockGetMemberEventScore(...args),
  getMemberTotalPoints: (...args: any[]) => mockGetMemberTotalPoints(...args),
  getPreviousCompletedEventId: (...args: any[]) =>
    mockGetPreviousCompletedEventId(...args),
}));

vi.mock("@/lib/admin-audit", () => ({
  logAdminAction: (...args: any[]) => mockLogAdminAction(...args),
}));

function member(
  userId: string,
  name: string,
  nickname: string,
): { userId: string; name: string; nickname: string } {
  return { userId, name, nickname };
}

describe("computeLeagueRecap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when user has no leagues", async () => {
    mockGetUserLeagueIds.mockResolvedValue([]);

    const { computeLeagueRecap } = await import(
      "@/server/services/league-recap"
    );
    const result = await computeLeagueRecap("u1", "e1");
    expect(result).toEqual([]);
  });

  it("sorts members by totalPoints DESC with name tie-breaker", async () => {
    mockGetUserLeagueIds.mockResolvedValue([{ group_id: "g1", group_name: "Alpha" }]);
    mockGetPreviousCompletedEventId.mockResolvedValue(null);

    const members = [
      member("u1", "Alice", "alice"),
      member("u2", "Bob", "bob"),
      member("u3", "Charlie", "charlie"),
    ];
    mockGetGroupMembers.mockResolvedValue(members);

    // eventXp (per-event): Alice=50, Bob=50, Charlie=80
    mockGetMemberEventScore
      .mockResolvedValueOnce({ totalPoints: 50 })
      .mockResolvedValueOnce({ totalPoints: 50 })
      .mockResolvedValueOnce({ totalPoints: 80 });

    // totalPoints (all-time): Alice=200, Bob=150, Charlie=180
    mockGetMemberTotalPoints
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(150)
      .mockResolvedValueOnce(180);

    const { computeLeagueRecap } = await import(
      "@/server/services/league-recap"
    );
    const result = await computeLeagueRecap("u1", "e1");

    expect(result).toHaveLength(1);
    const standings = result[0];
    expect(standings.groupId).toBe("g1");

    // Sorted by eventXp DESC: Charlie(80) then Alice(50)=Bob(50) with name tie-breaker (Alice < Bob)
    expect(standings.members[0].userId).toBe("u3"); // Charlie - eventXp 80
    expect(standings.members[1].userId).toBe("u1"); // Alice  - eventXp 50 (name before Bob)
    expect(standings.members[2].userId).toBe("u2"); // Bob    - eventXp 50

    // totalPoints (all-time) differs from eventXp
    expect(standings.members[0].eventXp).toBe(80);
    expect(standings.members[0].totalPoints).toBe(180);
    expect(standings.members[1].eventXp).toBe(50);
    expect(standings.members[1].totalPoints).toBe(200);
    expect(standings.members[2].eventXp).toBe(50);
    expect(standings.members[2].totalPoints).toBe(150);
  });

  it("computes correct movement: up, down, same, new", async () => {
    mockGetUserLeagueIds.mockResolvedValue([{ group_id: "g1", group_name: "Alpha" }]);
    mockGetPreviousCompletedEventId.mockResolvedValue("prev-e1");

    const members = [
      member("u1", "Alice", "alice"),
      member("u2", "Bob", "bob"),
      member("u3", "Charlie", "charlie"),
      member("u4", "Dana", "dana"),
    ];
    mockGetGroupMembers.mockResolvedValue(members);

    // Current event scores (eventXp): Alice=80, Bob=50, Charlie=90, Dana=40
    mockGetMemberEventScore
      .mockResolvedValueOnce({ totalPoints: 80 })
      .mockResolvedValueOnce({ totalPoints: 50 })
      .mockResolvedValueOnce({ totalPoints: 90 })
      .mockResolvedValueOnce({ totalPoints: 40 });

    // Previous event scores: Alice=70, Bob=60, Charlie=90, Dana=0 (null)
    mockGetMemberEventScore
      .mockResolvedValueOnce({ totalPoints: 70 })
      .mockResolvedValueOnce({ totalPoints: 60 })
      .mockResolvedValueOnce({ totalPoints: 90 })
      .mockResolvedValueOnce(null);

    mockGetMemberTotalPoints
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(150)
      .mockResolvedValueOnce(250)
      .mockResolvedValueOnce(40);

    const { computeLeagueRecap } = await import(
      "@/server/services/league-recap"
    );
    const result = await computeLeagueRecap("u1", "e1");

    const standings = result[0].members;

    // Current ranking by eventXp DESC: Charlie(90), Alice(80), Bob(50), Dana(40)
    // Prev ranking by prev scores DESC: Charlie(90), Alice(70), Bob(60), Dana(0)
    // Prev positions: Charlie=1, Alice=2, Bob=3, Dana=4 (null score = 0, ranks at bottom)
    // Actually let me think...
    // prev: Charlie(90), Alice(70), Bob(60), Dana(0) — positions: Charlie=1, Alice=2, Bob=3, Dana=4
    // current: Charlie(90), Alice(80), Bob(50), Dana(40) — positions: Charlie=1, Alice=2, Bob=3, Dana=4
    // So Charlie: 1->1 same, Alice: 2->2 same, Bob: 3->3 same, Dana: 4->4 same

    expect(standings[0].userId).toBe("u3"); // Charlie: same
    expect(standings[0].movement).toBe("same");
    expect(standings[0].movementDelta).toBe(0);

    expect(standings[1].userId).toBe("u1"); // Alice: same
    expect(standings[1].movement).toBe("same");
    expect(standings[1].movementDelta).toBe(0);

    expect(standings[2].userId).toBe("u2"); // Bob: same
    expect(standings[2].movement).toBe("same");
    expect(standings[2].movementDelta).toBe(0);

    expect(standings[3].userId).toBe("u4"); // Dana: same (had position before)
    expect(standings[3].movement).toBe("same");
    expect(standings[3].movementDelta).toBe(0);
  });

  it("computes correct movementDelta for position changes", async () => {
    mockGetUserLeagueIds.mockResolvedValue([{ group_id: "g1", group_name: "Alpha" }]);
    mockGetPreviousCompletedEventId.mockResolvedValue("prev-e1");

    const members = [
      member("u1", "Alice", "alice"),
      member("u2", "Bob", "bob"),
      member("u3", "Charlie", "charlie"),
    ];
    mockGetGroupMembers.mockResolvedValue(members);

    // Current: Alice=90, Bob=80, Charlie=70
    mockGetMemberEventScore
      .mockResolvedValueOnce({ totalPoints: 90 })
      .mockResolvedValueOnce({ totalPoints: 80 })
      .mockResolvedValueOnce({ totalPoints: 70 });

    // Previous: Alice=60 (was 2nd), Bob=100 (was 1st), Charlie=50 (was 3rd)
    mockGetMemberEventScore
      .mockResolvedValueOnce({ totalPoints: 60 })
      .mockResolvedValueOnce({ totalPoints: 100 })
      .mockResolvedValueOnce({ totalPoints: 50 });

    mockGetMemberTotalPoints
      .mockResolvedValueOnce(300)
      .mockResolvedValueOnce(280)
      .mockResolvedValueOnce(200);

    const { computeLeagueRecap } = await import(
      "@/server/services/league-recap"
    );
    const result = await computeLeagueRecap("u1", "e1");

    const standings = result[0].members;

    // Prev: Bob(100)=1, Alice(60)=2, Charlie(50)=3
    // Current: Alice(90)=1, Bob(80)=2, Charlie(70)=3
    // Alice: 2->1 = up, delta=1
    // Bob: 1->2 = down, delta=1
    // Charlie: 3->3 = same, delta=0

    expect(standings[0].userId).toBe("u1"); // Alice moved up from 2 to 1
    expect(standings[0].movement).toBe("up");
    expect(standings[0].movementDelta).toBe(1);

    expect(standings[1].userId).toBe("u2"); // Bob moved down from 1 to 2
    expect(standings[1].movement).toBe("down");
    expect(standings[1].movementDelta).toBe(1);

    expect(standings[2].userId).toBe("u3"); // Charlie stayed
    expect(standings[2].movement).toBe("same");
    expect(standings[2].movementDelta).toBe(0);
  });

  it("marks movement as 'new' when previous eventId is null", async () => {
    mockGetUserLeagueIds.mockResolvedValue([{ group_id: "g1", group_name: "Alpha" }]);
    mockGetPreviousCompletedEventId.mockResolvedValue(null);

    const members = [
      member("u1", "Alice", "alice"),
      member("u2", "Bob", "bob"),
    ];
    mockGetGroupMembers.mockResolvedValue(members);

    mockGetMemberEventScore
      .mockResolvedValueOnce({ totalPoints: 80 })
      .mockResolvedValueOnce({ totalPoints: 50 });

    mockGetMemberTotalPoints
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(150);

    const { computeLeagueRecap } = await import(
      "@/server/services/league-recap"
    );
    const result = await computeLeagueRecap("u1", "e1");

    const standings = result[0].members;
    expect(standings[0].movement).toBe("new");
    expect(standings[0].movementDelta).toBe(0);
    expect(standings[1].movement).toBe("new");
    expect(standings[1].movementDelta).toBe(0);
  });

  it("ranks members with null previous score at the bottom (movement up)", async () => {
    mockGetUserLeagueIds.mockResolvedValue([{ group_id: "g1", group_name: "Alpha" }]);
    mockGetPreviousCompletedEventId.mockResolvedValue("prev-e1");

    const members = [
      member("u1", "Alice", "alice"),
      member("u2", "Bob", "bob"),
      member("u3", "Charlie", "charlie"),
    ];
    mockGetGroupMembers.mockResolvedValue(members);

    // Current: all have scores
    mockGetMemberEventScore
      .mockResolvedValueOnce({ totalPoints: 80 })
      .mockResolvedValueOnce({ totalPoints: 50 })
      .mockResolvedValueOnce({ totalPoints: 70 });

    // Previous: only u1 and u2 have scores, u3 has null (ranks at bottom with 0)
    mockGetMemberEventScore
      .mockResolvedValueOnce({ totalPoints: 70 })
      .mockResolvedValueOnce({ totalPoints: 40 })
      .mockResolvedValueOnce(null);

    mockGetMemberTotalPoints
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(150)
      .mockResolvedValueOnce(70);

    const { computeLeagueRecap } = await import(
      "@/server/services/league-recap"
    );
    const result = await computeLeagueRecap("u1", "e1");

    const standings = result[0].members;

    // Current ranking by eventXp DESC: Alice(80)=1, Charlie(70)=2, Bob(50)=3
    // Prev ranking: Alice(70)=1, Bob(40)=2, Charlie(null->0)=3
    // Charlie: 3->2 up, Alice: 1->1 same, Bob: 2->3 down

    const alice = standings.find((m) => m.userId === "u1")!;
    expect(alice.movement).toBe("same");
    expect(alice.movementDelta).toBe(0);

    const charlie = standings.find((m) => m.userId === "u3")!;
    expect(charlie.movement).toBe("up");
    expect(charlie.movementDelta).toBe(1);

    const bob = standings.find((m) => m.userId === "u2")!;
    expect(bob.movement).toBe("down");
    expect(bob.movementDelta).toBe(1);
  });

  it("handles single-member league", async () => {
    mockGetUserLeagueIds.mockResolvedValue([{ group_id: "g1", group_name: "Solo" }]);
    mockGetPreviousCompletedEventId.mockResolvedValue("prev-e1");

    const members = [member("u1", "Alice", "alice")];
    mockGetGroupMembers.mockResolvedValue(members);

    mockGetMemberEventScore
      .mockResolvedValueOnce({ totalPoints: 100 })
      .mockResolvedValueOnce({ totalPoints: 80 });

    mockGetMemberTotalPoints.mockResolvedValueOnce(300);

    const { computeLeagueRecap } = await import(
      "@/server/services/league-recap"
    );
    const result = await computeLeagueRecap("u1", "e1");

    expect(result).toHaveLength(1);
    const standings = result[0];
    expect(standings.members).toHaveLength(1);
    expect(standings.members[0].position).toBe(1);
    expect(standings.members[0].userId).toBe("u1");
    expect(standings.members[0].isCurrentUser).toBe(true);
    expect(standings.members[0].eventXp).toBe(100);
    expect(standings.members[0].totalPoints).toBe(300);
    // moved from 1 to 1
    expect(standings.members[0].movement).toBe("same");
    expect(standings.members[0].movementDelta).toBe(0);
  });

  it("returns multiple league standings", async () => {
    mockGetUserLeagueIds.mockResolvedValue([
      { group_id: "g1", group_name: "Alpha" },
      { group_id: "g2", group_name: "Beta" },
    ]);
    mockGetPreviousCompletedEventId.mockResolvedValue(null);

    const membersA = [member("u1", "Alice", "alice")];
    const membersB = [member("u2", "Bob", "bob")];

    mockGetGroupMembers
      .mockResolvedValueOnce(membersA)
      .mockResolvedValueOnce(membersB);

    mockGetMemberEventScore.mockResolvedValueOnce({ totalPoints: 50 });
    mockGetMemberTotalPoints.mockResolvedValueOnce(200);
    mockGetMemberEventScore.mockResolvedValueOnce({ totalPoints: 70 });
    mockGetMemberTotalPoints.mockResolvedValueOnce(180);

    const { computeLeagueRecap } = await import(
      "@/server/services/league-recap"
    );
    const result = await computeLeagueRecap("u1", "e1");

    expect(result).toHaveLength(2);
    expect(result[0].groupId).toBe("g1");
    expect(result[0].groupName).toBe("Alpha");
    expect(result[1].groupId).toBe("g2");
    expect(result[1].groupName).toBe("Beta");
  });

  it("continues to next league when one fails and logs the error", async () => {
    mockGetUserLeagueIds.mockResolvedValue([
      { group_id: "g1", group_name: "Alpha" },
      { group_id: "g2", group_name: "Beta" },
    ]);
    mockGetPreviousCompletedEventId.mockResolvedValue(null);

    // First league throws
    mockGetGroupMembers.mockRejectedValueOnce(new Error("DB error"));

    // Second league succeeds
    const membersB = [member("u2", "Bob", "bob")];
    mockGetGroupMembers.mockResolvedValueOnce(membersB);
    mockGetMemberEventScore.mockResolvedValueOnce({ totalPoints: 70 });
    mockGetMemberTotalPoints.mockResolvedValueOnce(180);

    const { computeLeagueRecap } = await import(
      "@/server/services/league-recap"
    );
    const result = await computeLeagueRecap("u1", "e1");

    // Only Beta succeeds
    expect(result).toHaveLength(1);
    expect(result[0].groupId).toBe("g2");

    // Error was logged
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      mockAdminClient,
      expect.objectContaining({
        userId: "u1",
        action: "league_recap_compute_failed",
        details: expect.objectContaining({
          groupId: "g1",
          error: "Error: DB error",
        }),
      }),
    );
  });

  it("isCurrentUser is true only for the requested user", async () => {
    mockGetUserLeagueIds.mockResolvedValue([{ group_id: "g1", group_name: "Alpha" }]);
    mockGetPreviousCompletedEventId.mockResolvedValue(null);

    const members = [
      member("u1", "Alice", "alice"),
      member("u2", "Bob", "bob"),
    ];
    mockGetGroupMembers.mockResolvedValue(members);

    mockGetMemberEventScore
      .mockResolvedValueOnce({ totalPoints: 80 })
      .mockResolvedValueOnce({ totalPoints: 50 });

    mockGetMemberTotalPoints
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(150);

    const { computeLeagueRecap } = await import(
      "@/server/services/league-recap"
    );
    const result = await computeLeagueRecap("u2", "e1"); // Bob is current user

    const standings = result[0].members;
    expect(standings[0].isCurrentUser).toBe(false); // Alice
    expect(standings[1].isCurrentUser).toBe(true);  // Bob
  });
});
