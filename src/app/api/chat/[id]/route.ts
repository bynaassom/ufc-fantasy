export const dynamic = "force-dynamic";

export async function DELETE() {
  return Response.json(
    { ok: false, error: { code: "CHAT_RETIRED", message: "O chat foi desativado." } },
    { status: 410 },
  );
}
