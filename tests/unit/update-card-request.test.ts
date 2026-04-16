import { readUpdateCardRequest } from "@/lib/update-card-request";

describe("readUpdateCardRequest", () => {
  it("reads the request body once and preserves selected removals", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({
        event_id: "event-123",
        confirm_removals: true,
        remove_ids: ["fight-1", "fight-2", 99, null],
      }),
    };

    await expect(readUpdateCardRequest(request)).resolves.toEqual({
      event_id: "event-123",
      confirm_removals: true,
      remove_ids: ["fight-1", "fight-2"],
    });
    expect(request.json).toHaveBeenCalledTimes(1);
  });

  it("falls back to empty defaults when the payload is invalid", async () => {
    const request = {
      json: vi.fn().mockResolvedValue(null),
    };

    await expect(readUpdateCardRequest(request)).resolves.toEqual({
      event_id: "",
      confirm_removals: false,
      remove_ids: [],
    });
    expect(request.json).toHaveBeenCalledTimes(1);
  });
});
