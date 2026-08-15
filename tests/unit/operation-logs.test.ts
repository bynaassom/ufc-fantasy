import { describe, expect, it } from "vitest";

import { sanitizeLogDetails } from "@/server/services/operation-logs";

describe("operation log sanitization", () => {
  it("redacts sensitive values recursively without dropping diagnostics", () => {
    expect(
      sanitizeLogDetails({
        event_id: "event-1",
        authorization: "Bearer private",
        source: {
          url: "https://ufc.com/event/example",
          api_key: "private",
        },
        attempts: [{ cookie: "private", status: 200 }],
      }),
    ).toEqual({
      event_id: "event-1",
      authorization: "[oculto]",
      source: {
        url: "https://ufc.com/event/example",
        api_key: "[oculto]",
      },
      attempts: [{ cookie: "[oculto]", status: 200 }],
    });
  });
});
