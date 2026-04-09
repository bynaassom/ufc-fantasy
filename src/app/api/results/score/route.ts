import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/admin-audit";
import { assertSameOriginForMutation } from "@/server/api";

export async function POST(request: NextRequest) {
  try {
    assertSameOriginForMutation(request);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_banned")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin" || profile?.is_banned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const fightId = body.fightId || body.fight_id;
    if (!fightId)
      return NextResponse.json({ error: "fightId required" }, { status: 400 });

    const adminClient = await createAdminClient();

    const { data: fight } = await adminClient
      .from("fights")
      .select("event:events(slug)")
      .eq("id", fightId)
      .single();

    const { error } = await adminClient.rpc("score_picks_for_fight", {
      p_fight_id: fightId,
    });

    if (error) throw error;

    revalidatePath("/ranking");
    revalidatePath("/home");
    const eventSlug = (fight?.event as any)?.slug;
    if (eventSlug) {
      revalidatePath(`/event/${eventSlug}`);
    }

    await logAdminAction(adminClient, {
      userId: user.id,
      action: "admin_score_fight",
      details: {
        fight_id: fightId,
        event_slug: eventSlug || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Score error:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
