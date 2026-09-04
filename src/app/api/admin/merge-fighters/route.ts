export const dynamic = "force-dynamic";

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
  slug?: string | null;
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
    .select("id, name, headshot_url, country, ufc_fighter_id, slug")
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
    favoriteFighterRows,
    sameFightConflicts,
  ] = await Promise.all([
    auth.adminSupabase.from("fights").select("id", { count: "exact", head: true }).eq("fighter_a_id", duplicateId),
    auth.adminSupabase.from("fights").select("id", { count: "exact", head: true }).eq("fighter_b_id", duplicateId),
    auth.adminSupabase.from("fights").select("id", { count: "exact", head: true }).eq("winner_id", duplicateId),
    auth.adminSupabase.from("picks").select("id", { count: "exact", head: true }).eq("picked_winner_id", duplicateId),
    auth.adminSupabase.from("profiles").select("id", { count: "exact", head: true }).eq("favorite_fighter_id", duplicateId),
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
      favorite_fighter_refs: favoriteFighterRows.count || 0,
    },
    conflicts,
    merged_profile: {
      headshot_url: primary.headshot_url || duplicate.headshot_url || null,
      country: primary.country || duplicate.country || null,
      ufc_fighter_id: primary.ufc_fighter_id || duplicate.ufc_fighter_id || null,
      slug: primary.slug || duplicate.slug || null,
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

  const { error: mergeError } = await auth.adminSupabase.rpc("merge_fighter_records", {
    p_primary_id: primaryId,
    p_duplicate_id: duplicateId,
  });

  if (mergeError) {
    const isConflict = /merge bloqueado|conflito/i.test(mergeError.message);
    return NextResponse.json(
      { error: mergeError.message, summary },
      { status: isConflict ? 409 : 500 },
    );
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
