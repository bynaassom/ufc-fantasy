type JsonRequestLike = {
  json(): Promise<unknown>;
};

export type UpdateCardRequestPayload = {
  event_id: string;
  confirm_removals: boolean;
  remove_ids: string[];
};

export async function readUpdateCardRequest(
  request: JsonRequestLike,
): Promise<UpdateCardRequestPayload> {
  const body = await request.json().catch(() => ({}));
  const payload = body && typeof body === "object" ? body : {};
  const removeIds = Array.isArray((payload as { remove_ids?: unknown }).remove_ids)
    ? (payload as { remove_ids: unknown[] }).remove_ids.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      )
    : [];

  return {
    event_id:
      typeof (payload as { event_id?: unknown }).event_id === "string"
        ? (payload as { event_id: string }).event_id
        : "",
    confirm_removals:
      (payload as { confirm_removals?: unknown }).confirm_removals === true,
    remove_ids: removeIds,
  };
}
