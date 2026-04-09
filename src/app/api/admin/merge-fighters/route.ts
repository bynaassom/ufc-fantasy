import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-audit";
import { assertSameOriginForMutation } from "@/server/api";

type FighterRecord = {
  id: string;
  name: string;
  headshot_url?: string | null;
  country?: string | null;
  ufc_fighter_id?: string | null;
};

async function requireAdmin() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("role, is_banned")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.is_banned) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { adminSupabase, userId: user.id };
}

export async function POST(req: NextRequest) {
  assertSameOriginForMutation(req);
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const primaryId = typeof body?.primary_id === "string" ? body.primary_id : null;
  const duplicateId = typeof body?.duplicate_id === "string" ? body.duplicate_id : null;
  const dryRun = body?.dry_run === true;

  if (!primaryId || !duplicateId || primaryId === duplicateId) {
    return NextResponse.json(
      { error: "Selecione dois lutadores diferentes" },
      { status: 400 },
    );
  }

  const { data: fighters, error: fightersError } = await auth.adminSupabase
    .from("fighters")
    .select("id, name, headshot_url, country, ufc_fighter_id")
    .in("id", [primaryId, duplicateId]);

  if (fightersError || !fighters || fighters.length !== 2) {
    return NextResponse.json(
      { error: "Lutadores não encontrados" },
      { status: 404 },
    );
  }

  const primary = fighters.find((fighter: FighterRecord) => fighter.id === primaryId) as FighterRecord;
  const duplicate = fighters.find((fighter: FighterRecord) => fighter.id === duplicateId) as FighterRecord;

  const [
    fightsAsA,
    fightsAsB,
    winnerFights,
    pickedWinnerRows,
    sameFightConflicts,
  ] = await Promise.all([
    auth.adminSupabase.from("fights").select("id", { count: "exact", head: true }).eq("fighter_a_id", duplicateId),
    auth.adminSupabase.from("fights").select("id", { count: "exact", head: true }).eq("fighter_b_id", duplicateId),
    auth.adminSupabase.from("fights").select("id", { count: "exact", head: true }).eq("winner_id", duplicateId),
    auth.adminSupabase.from("picks").select("id", { count: "exact", head: true }).eq("picked_winner_id", duplicateId),
    auth.adminSupabase
      .from("fights")
      .select("id, fighter_a:fighters!fighter_a_id(name), fighter_b:fighters!fighter_b_id(name)")
      .or(
        `and(fighter_a_id.eq.${primaryId},fighter_b_id.eq.${duplicateId}),and(fighter_a_id.eq.${duplicateId},fighter_b_id.eq.${primaryId})`,
      ),
  ]);

  const conflicts = (sameFightConflicts.data || []).map((fight: any) => ({
    id: fight.id,
    label: `${fight.fighter_a?.name || "?"} vs ${fight.fighter_b?.name || "?"}`,
  }));

  const summary = {
    primary: {
      id: primary.id,
      name: primary.name,
    },
    duplicate: {
      id: duplicate.id,
      name: duplicate.name,
    },
    impacts: {
      fights_as_a: fightsAsA.count || 0,
      fights_as_b: fightsAsB.count || 0,
      winner_refs: winnerFights.count || 0,
      picked_winner_refs: pickedWinnerRows.count || 0,
    },
    conflicts,
    merged_profile: {
      headshot_url: primary.headshot_url || duplicate.headshot_url || null,
      country: primary.country || duplicate.country || null,
      ufc_fighter_id: primary.ufc_fighter_id || duplicate.ufc_fighter_id || null,
    },
  };

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry_run: true,
      message:
        conflicts.length > 0
          ? "Merge bloqueado por conflitos"
          : "Merge pronto para aplicar",
      summary,
    });
  }

  if (conflicts.length > 0) {
    return NextResponse.json(
      {
        error: "Merge bloqueado: existe luta em que os dois IDs já aparecem um contra o outro",
        summary,
      },
      { status: 409 },
    );
  }

  const mergedProfile = summary.merged_profile;

  const { error: updatePrimaryError } = await auth.adminSupabase
    .from("fighters")
    .update(mergedProfile)
    .eq("id", primaryId);

  if (updatePrimaryError) {
    return NextResponse.json({ error: updatePrimaryError.message }, { status: 500 });
  }

  const operations = [
    auth.adminSupabase.from("fights").update({ fighter_a_id: primaryId }).eq("fighter_a_id", duplicateId),
    auth.adminSupabase.from("fights").update({ fighter_b_id: primaryId }).eq("fighter_b_id", duplicateId),
    auth.adminSupabase.from("fights").update({ winner_id: primaryId }).eq("winner_id", duplicateId),
    auth.adminSupabase.from("picks").update({ picked_winner_id: primaryId }).eq("picked_winner_id", duplicateId),
  ];

  for (const operation of operations) {
    const { error } = await operation;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { error: deleteError } = await auth.adminSupabase
    .from("fighters")
    .delete()
    .eq("id", duplicateId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await logAdminAction(auth.adminSupabase, {
    userId: auth.userId,
    action: "admin_merge_fighters",
    details: {
      primary_id: primaryId,
      primary_name: primary.name,
      duplicate_id: duplicateId,
      duplicate_name: duplicate.name,
      impacts: summary.impacts,
    },
  });

  return NextResponse.json({
    ok: true,
    message: `Lutador duplicado mesclado em ${primary.name}`,
    summary,
  });
}
