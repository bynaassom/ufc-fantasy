import type { SupabaseClient } from "@supabase/supabase-js";

export type DbClient = SupabaseClient;

export function withClient(client: DbClient) {
  return client;
}
