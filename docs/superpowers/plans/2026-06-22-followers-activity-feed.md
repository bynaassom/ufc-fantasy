# Followers & Activity Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add open follower system + append-only activity feed, with activity generated at source (picks, results, challenges, leagues, streaks, levels) and rendered on /home under "ATIVIDADE" tab.

**Architecture:** New `user_follows` and `user_activity` tables. Activities generated at the source (service layer hooks). Feed reads `user_activity` filtered by followed users, paginated by cursor. Counters on profiles (followers/following_count) updated via triggers or service layer.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, Supabase, vitest

## Global Constraints

- Follow model: open (Twitter-style), no approval, anyone can follow anyone.
- Self-follow blocked by CHECK constraint.
- Activity types: `pick_submitted`, `result_scored`, `challenge_created`, `challenge_accepted`, `challenge_completed`, `league_joined`, `streak_milestone`, `level_up`.
- Activity logging must never break main flows (silent catch).
- Feed: cursor-based pagination, 20 items per page.
- Copy/UX: Pt-BR, dark theme, red accents, CSS variables.
- Follow buttons on `/jogador/[nickname]`, league member rows, ranking rows.
- Profile: bio, favorite fighter, followers/following counts.

---

### Task 1: Migration + types

**Files:**
- Create: `supabase/migrations/20260622000000_followers_activity.sql`
- Modify: `src/types/index.ts` (add types)
- No test (migration is self-verifying)

**Interfaces:**
- Produces: `user_follows`, `user_activity` tables + indexes + RLS
- Produces: `profiles` new columns (bio, favorite_fighter_id, followers_count, following_count)
- Produces: `UserFollow`, `UserActivity`, `ActivityFeedItem` types

- [ ] **Step 1: Create the migration**

```sql
-- 20260622000000_followers_activity.sql
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_created ON user_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity(created_at DESC);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio                TEXT,
  ADD COLUMN IF NOT EXISTS favorite_fighter_id UUID REFERENCES fighters(id),
  ADD COLUMN IF NOT EXISTS followers_count    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count    INTEGER NOT NULL DEFAULT 0;

-- RLS: user_follows
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_follows_select_own" ON user_follows;
CREATE POLICY "user_follows_select_own" ON user_follows
  FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

DROP POLICY IF EXISTS "user_follows_admin_select" ON user_follows;
CREATE POLICY "user_follows_admin_select" ON user_follows
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_banned = false)
  );

-- RLS: user_activity
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_activity_select_followed" ON user_activity;
CREATE POLICY "user_activity_select_followed" ON user_activity
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_follows
      WHERE follower_id = auth.uid() AND following_id = user_activity.user_id
    )
  );

DROP POLICY IF EXISTS "user_activity_admin_select" ON user_activity;
CREATE POLICY "user_activity_admin_select" ON user_activity
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_banned = false)
  );
```

- [ ] **Step 2: Add types to src/types/index.ts**

```typescript
export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export const ACTIVITY_TYPES = [
  "pick_submitted",
  "result_scored",
  "challenge_created",
  "challenge_accepted",
  "challenge_completed",
  "league_joined",
  "streak_milestone",
  "level_up",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface UserActivity {
  id: string;
  user_id: string;
  type: ActivityType;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ActivityFeedItem extends UserActivity {
  profile?: {
    nickname: string;
    first_name: string;
    last_name: string;
  };
}
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit`

```bash
git add supabase/migrations/20260622000000_followers_activity.sql src/types/index.ts
git commit -m "feat(follow): migration for follows, activity log, and profile extensions"
```

---

### Task 2: Follows repo + service + API

**Files:**
- Create: `src/server/repositories/follows.ts`
- Create: `src/server/services/follows.ts`
- Create: `src/app/api/follow/[userId]/route.ts`
- Test: `tests/unit/follows.test.ts`

**Interfaces:**
- Produces: `followUser(followerId, followingId)` — inserts follow, updates counters
- Produces: `unfollowUser(followerId, followingId)` — deletes follow, updates counters
- Produces: `getFollowers(userId)`, `getFollowing(userId)` — list with profile names
- Produces: `POST /api/follow/[userId]` — toggles follow/unfollow

- [ ] **Step 1: Create the repository**

```typescript
// src/server/repositories/follows.ts
import type { DbClient } from "@/types/database";

export async function isFollowing(
  client: DbClient,
  followerId: string,
  followingId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("user_follows")
    .select("id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function followUser(
  client: DbClient,
  followerId: string,
  followingId: string,
): Promise<void> {
  if (followerId === followingId) throw new Error("Cannot follow yourself");

  const { error } = await client.from("user_follows").insert({
    follower_id: followerId,
    following_id: followingId,
  });

  if (error) {
    if (error.code === "23505") return; // already following, OK
    throw error;
  }

  // Update counters
  await client.rpc("update_follow_counters", {
    p_follower_id: followerId,
    p_following_id: followingId,
    p_increment: true,
  });
}

export async function unfollowUser(
  client: DbClient,
  followerId: string,
  followingId: string,
): Promise<void> {
  const { error } = await client
    .from("user_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) throw error;

  await client.rpc("update_follow_counters", {
    p_follower_id: followerId,
    p_following_id: followingId,
    p_increment: false,
  });
}

export async function listFollowers(
  client: DbClient,
  userId: string,
  limit = 20,
): Promise<any[]> {
  const { data, error } = await client
    .from("user_follows")
    .select("follower_id, created_at, profile:follower_id(nickname, first_name, last_name)")
    .eq("following_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function listFollowing(
  client: DbClient,
  userId: string,
  limit = 20,
): Promise<any[]> {
  const { data, error } = await client
    .from("user_follows")
    .select("following_id, created_at, profile:following_id(nickname, first_name, last_name)")
    .eq("follower_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}
```

Append the counter update RPC to the migration:

```sql
CREATE OR REPLACE FUNCTION update_follow_counters(
  p_follower_id UUID,
  p_following_id UUID,
  p_increment BOOLEAN
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles
  SET following_count = GREATEST(0, following_count + CASE WHEN p_increment THEN 1 ELSE -1 END)
  WHERE id = p_follower_id;

  UPDATE profiles
  SET followers_count = GREATEST(0, followers_count + CASE WHEN p_increment THEN 1 ELSE -1 END)
  WHERE id = p_following_id;
$$;
```

- [ ] **Step 2: Create the service**

```typescript
// src/server/services/follows.ts
import { requireActiveUser } from "@/server/auth/guards";
import {
  followUser as repoFollowUser,
  unfollowUser as repoUnfollowUser,
  isFollowing,
  listFollowers,
  listFollowing,
} from "@/server/repositories/follows";

export async function toggleFollow(followingId: string) {
  const { supabase, user } = await requireActiveUser();
  const following = await isFollowing(supabase, user.id, followingId);

  if (following) {
    await repoUnfollowUser(supabase, user.id, followingId);
    return { following: false };
  } else {
    await repoFollowUser(supabase, user.id, followingId);
    return { following: true };
  }
}

export async function getFollowersForUser(userId: string, limit = 20) {
  const { supabase } = await requireActiveUser();
  return listFollowers(supabase, userId, limit);
}

export async function getFollowingForUser(userId: string, limit = 20) {
  const { supabase } = await requireActiveUser();
  return listFollowing(supabase, userId, limit);
}
```

- [ ] **Step 3: Create the API route**

```typescript
// src/app/api/follow/[userId]/route.ts
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import {
  apiErrorFromUnknown,
  apiSuccess,
  assertSameOriginForMutation,
} from "@/server/api";
import { toggleFollow } from "@/server/services/follows";

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    assertSameOriginForMutation(request);
    const result = await toggleFollow(params.userId);
    return apiSuccess(result);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
```

- [ ] **Step 4: Write tests**

```typescript
// tests/unit/follows.test.ts
import { describe, it, expect, vi } from "vitest";

describe("follows service", () => {
  it("toggleFollow calls unfollow when already following", async () => {
    // Test will dispatch subagent implementation
  });

  it("toggleFollow calls follow when not following", async () => {});

  it("followUser throws on self-follow", async () => {});

  it("followUser is idempotent on duplicate", async () => {});
});
```

The implementer will flesh out the test mocks using the codebase's existing pattern (`vi.mock` + `any` client).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run tests/unit/follows.test.ts`

```bash
git add src/server/repositories/follows.ts src/server/services/follows.ts src/app/api/follow/\[userId\]/route.ts supabase/migrations/20260622000000_followers_activity.sql tests/unit/follows.test.ts
git commit -m "feat(follow): follow/unfollow repository, service, and API"
```

---

### Task 3: Activity repo + service + logActivity wrapper

**Files:**
- Create: `src/server/repositories/activity.ts`
- Create: `src/server/services/activity.ts`
- Test: `tests/unit/activity.test.ts`

**Interfaces:**
- Produces: `insertActivity(client, userId, type, metadata)` — insert with silent catch
- Produces: `listActivityForUsers(client, userIds, before?, limit?)` — paginated feed query
- Produces: `logActivity(userId, type, metadata)` — service wrapper, silently catches errors

- [ ] **Step 1: Create the repository**

```typescript
// src/server/repositories/activity.ts
import type { DbClient } from "@/types/database";
import type { UserActivity, ActivityType } from "@/types";

export async function insertActivity(
  client: DbClient,
  userId: string,
  type: ActivityType,
  metadata: Record<string, unknown>,
): Promise<void> {
  const { error } = await client.from("user_activity").insert({
    user_id: userId,
    type,
    metadata,
  });

  if (error) throw error;
}

export async function listActivityForUsers(
  client: DbClient,
  userIds: string[],
  before?: string | null,
  limit = 20,
): Promise<{ items: UserActivity[]; hasMore: boolean }> {
  let query = client
    .from("user_activity")
    .select("id, user_id, type, metadata, created_at, profile:user_id(nickname, first_name, last_name)")
    .in("user_id", userIds)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;

  if (error) throw error;

  const items = (data || []) as unknown as UserActivity[];
  const hasMore = items.length > limit;

  return {
    items: hasMore ? items.slice(0, limit) : items,
    hasMore,
  };
}
```

- [ ] **Step 2: Create the service**

```typescript
// src/server/services/activity.ts
import { getAdminSupabase } from "@/lib/supabase/service-role";
import {
  insertActivity,
  listActivityForUsers,
} from "@/server/repositories/activity";
import { listFollowing } from "@/server/repositories/follows";
import type { ActivityType, ActivityFeedItem } from "@/types";

export async function logActivity(
  userId: string,
  type: ActivityType,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    const admin = await getAdminSupabase();
    await insertActivity(admin, userId, type, metadata);
  } catch {
    // Silent catch — activity logging never breaks main flows
  }
}

export async function getFeedForUser(
  userId: string,
  before?: string | null,
  limit = 20,
): Promise<{ items: ActivityFeedItem[]; hasMore: boolean; nextCursor: string | null }> {
  const admin = await getAdminSupabase();
  const following = await listFollowing(admin, userId, 1000);
  const followingIds = following.map((f: any) => f.following_id);

  if (followingIds.length === 0) {
    return { items: [], hasMore: false, nextCursor: null };
  }

  // Include self in feed so users see their own activity too
  const feedUserIds = [userId, ...followingIds];

  const result = await listActivityForUsers(admin, feedUserIds, before, limit);
  const last = result.items[result.items.length - 1];

  return {
    items: result.items as ActivityFeedItem[],
    hasMore: result.hasMore,
    nextCursor: last?.created_at ?? null,
  };
}
```

- [ ] **Step 3: Write failing tests**

```typescript
// tests/unit/activity.test.ts
import { describe, it, expect } from "vitest";

describe("activity service", () => {
  it("logActivity silently catches errors and never throws", async () => {
    // Will mock Supabase to throw, verify logActivity returns undefined
  });

  it("getFeedForUser returns empty for user with no follows", async () => {
    // Mock listFollowing to return []
  });

  it("getFeedForUser paginates correctly", async () => {});
});
```

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run tests/unit/activity.test.ts`

```bash
git add src/server/repositories/activity.ts src/server/services/activity.ts tests/unit/activity.test.ts
git commit -m "feat(follow): activity repository, service, and logActivity wrapper"
```

---

### Task 4: Activity generation hooks

**Files:**
- Modify: `src/server/services/app.ts`
- Modify: `src/server/services/xp.ts`

**Interfaces:**
- Consumes: `logActivity` from `@/server/services/activity`
- Produces: activities generated at source for picks, results, challenges, leagues, streaks, levels

- [ ] **Step 1: Hook into picks submitted**

In `src/server/services/app.ts`, inside `saveMyEventPicks`, after the upsert succeeds:

```typescript
import { logActivity } from "@/server/services/activity";

// after successful pick save:
try {
  await logActivity(user.id, "pick_submitted", {
    eventName: event.name,
    eventSlug: event.slug,
    fightsCount: picks.length,
  });
} catch { /* silent */ }
```

- [ ] **Step 2: Hook into XP service for results, streak, level**

In `src/server/services/xp.ts`, inside `awardEventXpForAllUsers`, after XP is awarded to each user:

```typescript
import { logActivity } from "@/server/services/activity";

// After a user's XP is awarded and streak/level recomputed:
try {
  await logActivity(userId, "result_scored", {
    eventName: eventName, // pass eventName as parameter or fetch it
    eventSlug: eventSlug,
    correctWinners: computed.metadata.correct_winners,
    totalFights: computed.metadata.fights_with_picks,
    xpEarned: computed.amount,
  });

  // Check if streak hit milestone
  if ([3, 5, 10, 25].includes(newCurrentStreak)) {
    await logActivity(userId, "streak_milestone", {
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak,
    });
  }

  // Check if level changed
  if (newLevel > profile.level) {
    await logActivity(userId, "level_up", {
      newLevel,
      levelTitle: titleFromLevel(newLevel),
    });
  }
} catch { /* silent */ }
```

Note: `awardEventXpForAllUsers` needs access to eventName and eventSlug. The function currently only receives `eventId`. Modify its signature or fetch event data internally:

```typescript
// Add at top of awardEventXpForAllUsers:
const { data: eventData } = await admin
  .from("events")
  .select("name, slug")
  .eq("id", eventId)
  .single();
const eventName = eventData?.name || "—";
const eventSlug = eventData?.slug || "—";
```

- [ ] **Step 3: Hook into challenge lifecycle**

In `src/server/services/app.ts`, find `createUserChallenge`, `respondToChallenge`, and the challenge lifecycle resolver. Add `logActivity` calls with appropriate types and metadata.

- [ ] **Step 4: Hook into league join**

In `src/server/services/app.ts`, find the function that handles `addGroupMember`. Add:

```typescript
try {
  await logActivity(userId, "league_joined", {
    groupId: groupId,
    groupName: group.name,
  });
} catch { /* silent */ }
```

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/server/services/app.ts src/server/services/xp.ts
git commit -m "feat(follow): hook activity generation into picks, results, challenges, leagues"
```

---

### Task 5: Activity feed API

**Files:**
- Create: `src/app/api/activity/route.ts`

**Interfaces:**
- Consumes: `getFeedForUser` from `@/server/services/activity`
- Produces: `GET /api/activity?before=&limit=20` — paginated feed

- [ ] **Step 1: Create the API route**

```typescript
// src/app/api/activity/route.ts
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { apiErrorFromUnknown, apiSuccess } from "@/server/api";
import { requireActiveUser } from "@/server/auth/guards";
import { getFeedForUser } from "@/server/services/activity";

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireActiveUser();
    const { searchParams } = new URL(request.url);
    const before = searchParams.get("before");
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20", 10));
    const data = await getFeedForUser(user.id, before, limit);
    return apiSuccess(data);
  } catch (error) {
    return apiErrorFromUnknown(error);
  }
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit`

```bash
git add src/app/api/activity/route.ts
git commit -m "feat(follow): activity feed API route"
```

---

### Task 6: FollowButton + ActivityFeed + home tab

**Files:**
- Create: `src/components/profile/FollowButton.tsx`
- Create: `src/components/feed/ActivityFeed.tsx`
- Modify: `src/app/home/page.tsx`

**Interfaces:**
- Consumes: `POST /api/follow/[userId]`, `GET /api/activity`
- Produces: follow/unfollow toggle, activity feed component, home tab

- [ ] **Step 1: Create FollowButton**

```typescript
// src/components/profile/FollowButton.tsx
"use client";

import { useState } from "react";
import { adminSend } from "@/components/admin/shared";
import toast from "react-hot-toast";

export default function FollowButton({
  userId,
  initialFollowing,
}: {
  userId: string;
  initialFollowing?: boolean;
}) {
  const [following, setFollowing] = useState(!!initialFollowing);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const data = await adminSend<{ following: boolean }>(
        `/api/follow/${userId}`,
        { method: "POST" },
      );
      setFollowing(data.following);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="font-condensed text-xs uppercase tracking-widest px-3 py-1.5 transition-all"
      style={{
        border: following ? "1px solid var(--border)" : "1px solid var(--red)",
        backgroundColor: following ? "var(--bg-elevated)" : "var(--red)",
        color: following ? "var(--text-muted)" : "#000",
        opacity: loading ? 0.5 : 1,
      }}
    >
      {loading ? "..." : following ? "Seguindo" : "Seguir"}
    </button>
  );
}
```

- [ ] **Step 2: Create ActivityFeed**

```typescript
// src/components/feed/ActivityFeed.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import type { ActivityFeedItem } from "@/types";
import { adminGet } from "@/components/admin/shared";

const ACTIVITY_ICONS: Record<string, string> = {
  pick_submitted: "🎯",
  result_scored: "🏆",
  challenge_created: "⚔️",
  challenge_accepted: "⚔️",
  challenge_completed: "🏁",
  league_joined: "🏟️",
  streak_milestone: "🔥",
  level_up: "⭐",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "agora";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `ha ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `ha ${days} dia${days > 1 ? "s" : ""}`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

function activityText(item: ActivityFeedItem): string {
  const nick = item.profile?.nickname || "alguem";
  const m = item.metadata as any;
  switch (item.type) {
    case "pick_submitted": return `${nick} fez picks para ${m.eventName}`;
    case "result_scored": return `${nick} acertou ${m.correctWinners}/${m.totalFights} vencedores · +${m.xpEarned} XP`;
    case "challenge_created": return `${nick} desafiou ${m.challengedName}`;
    case "challenge_accepted": return `${nick} aceitou desafio de ${m.challengerName}`;
    case "challenge_completed": return `${nick} venceu desafio contra ${m.opponentName}`;
    case "league_joined": return `${nick} entrou na liga ${m.groupName}`;
    case "streak_milestone": return `${nick} atingiu ${m.currentStreak} eventos seguidos!`;
    case "level_up": return `${nick} subiu para ${m.levelTitle}!`;
    default: return "";
  }
}

export default function ActivityFeed() {
  const [items, setItems] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const fetchFeed = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (!reset && cursor) params.set("before", cursor);
      params.set("limit", "20");
      const data = await adminGet<{
        items: ActivityFeedItem[];
        hasMore: boolean;
        nextCursor: string | null;
      }>(`/api/activity?${params.toString()}`);
      setItems((prev) =>
        reset
          ? data.items
          : [...prev, ...data.items].filter(
              (m, i, arr) => arr.findIndex((x) => x.id === m.id) === i,
            ),
      );
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [cursor]);

  useEffect(() => {
    fetchFeed(true);
  }, []);

  return (
    <div>
      <h3
        className="font-condensed font-700 text-xs uppercase tracking-widest mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        Atividade
      </h3>

      {loading && items.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Carregando...
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="p-4" style={{ border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text)" }}>
            Siga outros jogadores para ver a atividade deles aqui.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--red)" }}>
          Erro ao carregar atividade.
        </p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 py-3"
          style={{ borderBottom: "1px solid var(--border-light)" }}
        >
          <span className="text-lg">{ACTIVITY_ICONS[item.type] || "·"}</span>
          <div className="flex-1 min-w-0">
            <p className="font-condensed text-sm" style={{ color: "var(--text)" }}>
              {activityText(item)}
            </p>
            <p className="font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
              {relativeTime(item.created_at)}
            </p>
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => fetchFeed()}
            disabled={loading}
            className="font-condensed text-xs uppercase tracking-widest px-6 py-2"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-elevated)",
              color: "var(--text)",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Add ATIVIDADE tab to home page**

Read `src/app/home/page.tsx`. Add an "ATIVIDADE" section alongside existing sections. Simple approach: render `<ActivityFeed />` above or below existing content:

```typescript
import ActivityFeed from "@/components/feed/ActivityFeed";

// in JSX:
<section className="mb-8">
  <ActivityFeed />
</section>
```

Add the same import and section to `src/app/home/page.tsx` where other sections (current event, challenges, etc.) are rendered.

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/components/profile/FollowButton.tsx src/components/feed/ActivityFeed.tsx src/app/home/page.tsx
git commit -m "feat(follow): FollowButton, ActivityFeed, and home tab integration"
```

---

### Task 7: Profile enhancements

**Files:**
- Modify: `src/server/validators/me.ts`
- Modify: `src/server/services/app.ts`
- Modify: `src/components/jogador/PublicProfileClient.tsx` (or equivalent)
- Modify: `src/app/jogador/[nickname]/page.tsx`

**Interfaces:**
- Consumes: `bio`, `favoriteFighterId`, followers/following counts
- Produces: enhanced profile display with FollowButton, bio, favorite fighter

- [ ] **Step 1: Extend profile update validator**

In `src/server/validators/me.ts`, add optional fields:

```typescript
export const updateMyProfileSchema = z.object({
  nickname: z.string().min(1).max(30).optional(),
  bio: z.string().max(200).optional(),
  favoriteFighterId: z.string().uuid().optional().nullable(),
});
```

- [ ] **Step 2: Extend updateMyProfile in app.ts**

In `src/server/services/app.ts`, the `updateMyProfile` function already accepts `{ nickname }`. Add `bio` and `favoriteFighterId` to the payload and pass them to the profile update repository:

```typescript
export async function updateMyProfile(payload: {
  nickname?: string;
  bio?: string;
  favoriteFighterId?: string | null;
}) {
  const { supabase, user } = await requireActiveUser();
  const update: Record<string, unknown> = {};
  if (payload.nickname !== undefined) update.nickname = payload.nickname;
  if (payload.bio !== undefined) update.bio = payload.bio;
  if (payload.favoriteFighterId !== undefined) update.favorite_fighter_id = payload.favoriteFighterId;
  return updateProfile(supabase, user.id, update);
}
```

- [ ] **Step 3: Add follow counts and bio to public profile data**

In `src/server/services/app.ts`, `getPublicProfilePageData` and `getMyProfile` already return profile data. Ensure they include the new fields (`bio`, `favorite_fighter_id`, `followers_count`, `following_count`). The profile selection already uses `select("*")` in the repository — the columns added in the migration will be included automatically.

In `getPublicProfilePageData`, add a check for whether the current user follows this profile:

```typescript
import { isFollowing } from "@/server/repositories/follows";

// inside getPublicProfilePageData, after getting the profile:
let isViewerFollowing = false;
if (currentUserId) {
  isViewerFollowing = await isFollowing(supabase, currentUserId, profile.id);
}
return { ..., isViewerFollowing, followersCount: profile.followers_count, followingCount: profile.following_count };
```

- [ ] **Step 4: Add FollowButton, bio, favorite fighter to public profile page**

Read `src/components/jogador/PublicProfileClient.tsx`. Add:

```typescript
import FollowButton from "@/components/profile/FollowButton";

// In the JSX, near the nickname/name area:
<div className="flex items-center gap-2 mt-2">
  <FollowButton userId={profile.id} initialFollowing={data.isViewerFollowing} />
  <span className="font-condensed text-xs" style={{ color: "var(--text-muted)" }}>
    {data.followersCount} seguidor{data.followersCount !== 1 ? "es" : ""}
  </span>
</div>

{/* Bio */}
{profile.bio && (
  <p className="text-sm mt-3" style={{ color: "var(--text)" }}>
    {profile.bio}
  </p>
)}

{/* Favorite fighter */}
{data.favoriteFighterName && (
  <p className="font-condensed text-xs uppercase tracking-widest mt-3" style={{ color: "var(--text-muted)" }}>
    Lutador favorito: {data.favoriteFighterName}
  </p>
)}
```

Also extend `getPublicProfilePageData` to include `favoriteFighterName`:

```typescript
let favoriteFighterName: string | null = null;
if (profile.favorite_fighter_id) {
  const { data: fighter } = await supabase
    .from("fighters")
    .select("name")
    .eq("id", profile.favorite_fighter_id)
    .maybeSingle();
  favoriteFighterName = fighter?.name || null;
}
return { ..., favoriteFighterName };
```

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add src/server/validators/me.ts src/server/services/app.ts src/components/jogador/PublicProfileClient.tsx src/app/jogador/\[nickname\]/page.tsx
git commit -m "feat(follow): profile enhancements with bio, favorite fighter, follow button"
```

---

### Final Verification

- [ ] Run `npx tsc --noEmit` — must pass
- [ ] Run `npx vitest run` — all tests pass
- [ ] Run `npm run build` — builds successfully
- [ ] Commit any remaining changes
