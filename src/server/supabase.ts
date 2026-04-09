import {
  createAdminClient as createServerAdminClient,
  createClient as createServerSupabaseClient,
} from "@/lib/supabase/server";

export type UserSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
export type AdminSupabaseClient = Awaited<ReturnType<typeof createServerAdminClient>>;

export async function getUserSupabase() {
  return createServerSupabaseClient();
}

export async function getAdminSupabase() {
  return createServerAdminClient();
}
