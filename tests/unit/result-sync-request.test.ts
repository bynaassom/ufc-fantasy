import {
  extractResultSyncEventId,
  resultSyncRequestDiagnostics,
} from "@/lib/result-sync-request";

describe("result sync request helpers", () => {
  it("reads event_id from the request body first", () => {
    expect(
      extractResultSyncEventId(
        { event_id: "body-event" },
        "https://example.com/api/sync-results?event_id=query-event",
      ),
    ).toBe("body-event");
  });

  it("falls back to event_id from the query string", () => {
    expect(
      extractResultSyncEventId(
        {},
        "https://example.com/api/sync-results?event_id=query-event",
      ),
    ).toBe("query-event");
  });

  it("returns safe diagnostics without exposing the sync secret", () => {
    expect(
      resultSyncRequestDiagnostics({
        body: { dry_run: true },
        isExternalCall: false,
        authHeader: "Bearer secret",
        syncSecret: "secret",
      }),
    ).toEqual({
      auth_mode: "admin_session",
      authorization_header_present: true,
      sync_secret_configured: true,
      body_keys: ["dry_run"],
    });
  });
});
