import { findEventBySlugWithFights } from "@/server/repositories/events";

describe("events repository", () => {
  it("includes fight odds in the public event payload", async () => {
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: { id: "event-1" }, error: null })),
    };
    const client = { from: vi.fn(() => query) };

    await findEventBySlugWithFights(client, "ufc-test");

    const selectedFields = query.select.mock.calls[0][0] as string;
    expect(selectedFields).toContain("odds_a");
    expect(selectedFields).toContain("odds_b");
    expect(query.eq).toHaveBeenCalledWith("slug", "ufc-test");
  });
});
