import { randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ApiRouteError } from "@/server/api";
import type { DbClient } from "@/types/database";

export const COMPANION_COOKIE_NAME = "ufc_companion_id";
const anonymousIdSchema = z.string().uuid();

export type CompanionIdentity =
  | { kind: "user"; id: string; shouldSetCookie: false }
  | { kind: "anonymous"; id: string; shouldSetCookie: boolean };

export async function resolveCompanionIdentity(
  request: NextRequest,
  adminClient: DbClient,
): Promise<CompanionIdentity> {
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (user) {
    const { data: profile, error } = await adminClient
      .from("profiles")
      .select("id, is_banned")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!profile || profile.is_banned) {
      throw new ApiRouteError(403, "ACCOUNT_UNAVAILABLE", "Conta indisponível.");
    }
    return { kind: "user", id: user.id, shouldSetCookie: false };
  }

  const cookieValue = request.cookies.get(COMPANION_COOKIE_NAME)?.value;
  const parsed = anonymousIdSchema.safeParse(cookieValue);
  if (parsed.success) {
    return { kind: "anonymous", id: parsed.data, shouldSetCookie: false };
  }

  return { kind: "anonymous", id: randomUUID(), shouldSetCookie: true };
}

export function attachCompanionCookie(
  response: NextResponse,
  identity: CompanionIdentity,
) {
  if (identity.kind !== "anonymous" || !identity.shouldSetCookie) return response;
  response.cookies.set(COMPANION_COOKIE_NAME, identity.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
  return response;
}
