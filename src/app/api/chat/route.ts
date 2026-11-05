export const dynamic = "force-dynamic";

// Old tabs may keep polling after deployment. Retire the API without touching
// Auth or the database; historical messages remain stored for now.
export async function GET() {
  return Response.json(
    { ok: false, error: { code: "CHAT_RETIRED", message: "O chat foi desativado." } },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}
