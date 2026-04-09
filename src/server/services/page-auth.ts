import { redirect } from "next/navigation";
import type { Profile } from "@/types";
import { findProfileById } from "@/server/repositories/profiles";
import { getUserSupabase } from "@/server/supabase";

export async function requirePageUserProfile() {
  const supabase = await getUserSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = (await findProfileById(supabase, user.id)) as Profile | null;
  if (!profile || profile.is_banned) {
    redirect("/login");
  }

  return { supabase, user, profile };
}

export async function requireAdminPageProfile() {
  const context = await requirePageUserProfile();
  return {
    ...context,
    isAdmin: context.profile.role === "admin",
  };
}
