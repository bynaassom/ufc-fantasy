import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import {
  isUsableHeadshotUrl,
  resolveUfcFighterMedia,
} from "@/lib/ufc-fighter-media";
import { logAdminAction } from "@/lib/admin-audit";

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
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dry_run === true;
  const limit =
    typeof body?.limit === "number" && body.limit > 0 ? Math.min(body.limit, 100) : 25;
  const onlyMissing = body?.only_missing !== false;

  const { data: fighters, error } = await auth.adminSupabase
    .from("fighters")
    .select("id, name, headshot_url, country")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const targets = (fighters || [])
    .filter((fighter: any) =>
      onlyMissing
        ? !isUsableHeadshotUrl(fighter.headshot_url)
        : true,
    )
    .slice(0, limit);

  const updated: string[] = [];
  const notFound: string[] = [];
  const errors: string[] = [];

  for (const fighter of targets) {
    try {
      const resolved = await resolveUfcFighterMedia(fighter.name);
      if (!resolved?.headshot_url) {
        notFound.push(fighter.name);
        continue;
      }

      if (!dryRun) {
        const payload: Record<string, unknown> = {
          headshot_url: resolved.headshot_url,
        };
        if (!fighter.country && resolved.country) {
          payload.country = resolved.country;
        }

        const { error: updateError } = await auth.adminSupabase
          .from("fighters")
          .update(payload)
          .eq("id", fighter.id);

        if (updateError) {
          errors.push(`${fighter.name}: ${updateError.message}`);
          continue;
        }
      }

      updated.push(fighter.name);
    } catch (routeError) {
      errors.push(
        `${fighter.name}: ${
          routeError instanceof Error ? routeError.message : "erro inesperado"
        }`,
      );
    }
  }

  await logAdminAction(auth.adminSupabase, {
    userId: auth.userId,
    action: "admin_enrich_fighter_media",
    details: {
      dry_run: dryRun,
      only_missing: onlyMissing,
      limit,
      processed_count: targets.length,
      updated_count: updated.length,
      not_found_count: notFound.length,
      error_count: errors.length,
    },
  });

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    message: dryRun
      ? `${updated.length} fighter(s) com foto pronta para atualizar`
      : `${updated.length} fighter(s) atualizados com foto`,
    processed_count: targets.length,
    updated,
    not_found: notFound,
    errors,
  });
}
