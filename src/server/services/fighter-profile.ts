import { getServiceRoleSupabase } from "@/lib/supabase/service-role";
import { generateFighterSlug } from "@/lib/fighter-slug";
import {
  findFighterBySlug,
  findFighterById,
  listFighterRecentFights,
  getFighterPickStats,
} from "@/server/repositories/fighter-profile";
import type { Fighter } from "@/types";

export type FighterProfileData = {
  fighter: Fighter;
  form: Awaited<ReturnType<typeof listFighterRecentFights>>;
  pickStats: Awaited<ReturnType<typeof getFighterPickStats>>;
};

export async function getFighterProfileData(
  slug: string,
): Promise<FighterProfileData> {
  const admin = await getServiceRoleSupabase();

  let fighter = await findFighterBySlug(admin, slug);

  if (!fighter) {
    fighter = await findFighterById(admin, slug);
  }

  if (!fighter) {
    const { data: all } = await admin.from("fighters").select("id, name, slug");
    const rows: { id: string; name: string; slug: string | null }[] = (all as any[]) || [];
    const match = rows.find((f) => {
      const computed = f.slug || generateFighterSlug(f.name);
      return computed === slug;
    });
    if (match) {
      fighter = await findFighterById(admin, match.id);
      if (fighter && !fighter.slug) {
        const genSlug = generateFighterSlug(fighter.name);
        await (admin as any).from("fighters").update({ slug: genSlug }).eq("id", fighter.id);
        fighter = { ...fighter, slug: genSlug };
      }
    }
  }

  if (!fighter) {
    throw new Error("Lutador não encontrado");
  }

  if (!fighter.slug) {
    const genSlug = generateFighterSlug(fighter.name);
    await (admin as any).from("fighters").update({ slug: genSlug }).eq("id", fighter.id);
    fighter = { ...fighter, slug: genSlug };
  }

  const [form, pickStats] = await Promise.all([
    listFighterRecentFights(admin, fighter.id),
    getFighterPickStats(admin, fighter.id),
  ]);

  return { fighter, form, pickStats };
}
