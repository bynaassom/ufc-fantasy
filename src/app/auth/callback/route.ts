import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { normalizeSafeRedirectPath } from "@/lib/security";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = normalizeSafeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Redirect to error page if something went wrong
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
