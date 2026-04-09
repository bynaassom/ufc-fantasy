import { PROFILE_SELECT_FIELDS } from "@/lib/security";
import type { Profile } from "@/types";
import { ApiRouteError } from "@/server/api";
import { getAdminSupabase, getUserSupabase } from "@/server/supabase";

export async function requireUser() {
  const supabase = await getUserSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new ApiRouteError(401, "UNAUTHORIZED", "Usuário não autenticado.");
  }

  return { supabase, user };
}

export async function requireActiveUser() {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_FIELDS)
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new ApiRouteError(403, "PROFILE_NOT_FOUND", "Perfil não encontrado.");
  }

  if (profile.is_banned) {
    throw new ApiRouteError(403, "USER_BANNED", "Usuário banido.");
  }

  return { supabase, user, profile: profile as Profile };
}

export async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const adminSupabase = await getAdminSupabase();
  const { data: profile, error } = await adminSupabase
    .from("profiles")
    .select(PROFILE_SELECT_FIELDS)
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.role !== "admin" || profile.is_banned) {
    throw new ApiRouteError(403, "FORBIDDEN", "Acesso restrito a administradores.");
  }

  return { supabase, adminSupabase, user, profile: profile as Profile };
}
