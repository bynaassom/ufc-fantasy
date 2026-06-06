export function extractResultSyncEventId(body: unknown, requestUrl: string) {
  const bodyEventId =
    body && typeof body === "object" && "event_id" in body
      ? String((body as { event_id?: unknown }).event_id || "").trim()
      : "";
  if (bodyEventId) return bodyEventId;

  try {
    return new URL(requestUrl).searchParams.get("event_id")?.trim() || "";
  } catch {
    return "";
  }
}

export function resultSyncRequestDiagnostics(input: {
  body: unknown;
  isExternalCall: boolean;
  authHeader: string | null;
  syncSecret?: string;
}) {
  return {
    auth_mode: input.isExternalCall ? "external" : "admin_session",
    authorization_header_present: !!input.authHeader,
    sync_secret_configured: !!input.syncSecret,
    body_keys:
      input.body && typeof input.body === "object" && !Array.isArray(input.body)
        ? Object.keys(input.body)
        : [],
  };
}
