import { getServiceRoleSupabase } from "@/lib/supabase/service-role";
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
    throw new Error("Lutador não encontrado");
  }

  const [form, pickStats] = await Promise.all([
    listFighterRecentFights(admin, fighter.id),
    getFighterPickStats(admin, fighter.id),
  ]);

  return { fighter, form, pickStats };
}
