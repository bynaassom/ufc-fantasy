import { createBrowserClient } from "@supabase/ssr";

function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function createAuthClient() {
  const client = createBrowserSupabaseClient();

  return {
    auth: client.auth,
  };
}
