import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockLt = vi.fn();

const mockClient: any = {
  from: vi.fn(() => ({
    select: mockSelect,
  })),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ eq: mockEq, order: mockOrder, lt: mockLt, single: mockSingle, maybeSingle: mockMaybeSingle });
  mockOrder.mockReturnValue({ limit: mockLimit });
  mockLimit.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockLt.mockReturnValue({ order: mockOrder });
});

describe("league recap repository", () => {
  describe("getPreviousCompletedEventId", () => {
    it("returns null when no previous completed events", async () => {
      const { getPreviousCompletedEventId } = await import("@/server/repositories/league-recap");

      mockSingle.mockResolvedValueOnce({ data: { event_date: "2025-01-15" }, error: null });
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await getPreviousCompletedEventId(mockClient, "e1");
      expect(result).toBeNull();
    });

    it("returns null when current event not found", async () => {
      const { getPreviousCompletedEventId } = await import("@/server/repositories/league-recap");

      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await getPreviousCompletedEventId(mockClient, "e-missing");
      expect(result).toBeNull();
    });

    it("returns the id of the previous completed event", async () => {
      const { getPreviousCompletedEventId } = await import("@/server/repositories/league-recap");

      mockSingle.mockResolvedValueOnce({ data: { event_date: "2025-02-01" }, error: null });
      mockMaybeSingle.mockResolvedValueOnce({ data: { id: "prev-event" }, error: null });

      const result = await getPreviousCompletedEventId(mockClient, "e1");
      expect(result).toBe("prev-event");
      expect(mockEq).toHaveBeenCalledWith("status", "completed");
      expect(mockLt).toHaveBeenCalledWith("event_date", "2025-02-01");
      expect(mockOrder).toHaveBeenCalledWith("event_date", { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(1);
    });
  });

  describe("getMemberEventScore", () => {
    it("returns null for user without score", async () => {
      const { getMemberEventScore } = await import("@/server/repositories/league-recap");

      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await getMemberEventScore(mockClient, "u1", "e1");
      expect(result).toBeNull();
      expect(mockClient.from).toHaveBeenCalledWith("event_scores");
      expect(mockEq).toHaveBeenCalledWith("user_id", "u1");
    });

    it("returns totalPoints for user with a score", async () => {
      const { getMemberEventScore } = await import("@/server/repositories/league-recap");

      mockMaybeSingle.mockResolvedValueOnce({ data: { total_points: 85 }, error: null });

      const result = await getMemberEventScore(mockClient, "u1", "e1");
      expect(result).toEqual({ totalPoints: 85 });
    });
  });

  describe("getGroupMembers", () => {
    it("returns formatted names from profile data", async () => {
      const { getGroupMembers } = await import("@/server/repositories/league-recap");

      mockEq.mockResolvedValueOnce({
        data: [
          {
            user_id: "u1",
            profile: { first_name: "John", last_name: "Doe", nickname: "johnd" },
          },
          {
            user_id: "u2",
            profile: { first_name: null, last_name: null, nickname: "janed" },
          },
        ],
        error: null,
      });

      const result = await getGroupMembers(mockClient, "g1");
      expect(result).toEqual([
        { userId: "u1", name: "John Doe", nickname: "johnd" },
        { userId: "u2", name: "janed", nickname: "janed" },
      ]);
    });

    it("handles missing profile gracefully", async () => {
      const { getGroupMembers } = await import("@/server/repositories/league-recap");

      mockEq.mockResolvedValueOnce({
        data: [{ user_id: "u1", profile: null }],
        error: null,
      });

      const result = await getGroupMembers(mockClient, "g1");
      expect(result).toEqual([{ userId: "u1", name: "—", nickname: "—" }]);
    });
  });

  describe("getUserLeagueIds", () => {
    it("returns group IDs and names for a user", async () => {
      const { getUserLeagueIds } = await import("@/server/repositories/league-recap");

      mockEq.mockResolvedValueOnce({
        data: [
          { group_id: "g1", group: { name: "Alpha" } },
          { group_id: "g2", group: null },
        ],
        error: null,
      });

      const result = await getUserLeagueIds(mockClient, "u1");
      expect(result).toEqual([
        { group_id: "g1", group_name: "Alpha" },
        { group_id: "g2", group_name: "—" },
      ]);
    });
  });
});
