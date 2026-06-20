# Followers & Activity Feed — Design (2026-06-22)

## Goal

Add a follower system and activity feed so users can track rivals and league
members. Competition-driven, Strava-style. Users follow each other openly;
an activity feed shows picks, results, challenges, leagues, streaks, and
level-ups from followed users. Loops served: League, Share.

## Product Decisions (locked in brainstorming)

- **Purpose:** Track rivals + league members (Strava-style, competition-driven).
- **Feed scope:** All relevant activity (picks, results, challenges, leagues,
  streaks, levels).
- **Follow model:** Open (Twitter-style), no approval required.
- **Entry points:** Everywhere — `/jogador/[nickname]`, league members list,
  ranking rows.
- **Architecture:** Activity log (Approach B) — `user_follows` + `user_activity`
  append-only tables. Activity rows generated at source.
- **Placement:** "ATIVIDADE" tab on `/home`.

## Data Model

### New tables

```sql
-- Follow relationships
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- Activity log (append-only)
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_created ON user_activity(user_id, created_at DESC);
CREATE INDEX idx_user_activity_created ON user_activity(created_at DESC);
```

### Activity types & metadata

| Type | When triggered | metadata |
|---|---|---|
| `pick_submitted` | User confirms picks | `{ eventName, eventSlug, fightsCount }` |
| `result_scored` | Event completes, results scored | `{ eventName, eventSlug, correctWinners, totalFights, xpEarned }` |
| `challenge_created` | User creates a challenge | `{ challengeId, challengedName, eventName }` |
| `challenge_accepted` | User accepts a challenge | `{ challengeId, challengerName, eventName }` |
| `challenge_completed` | Challenge resolved | `{ challengeId, opponentName, winnerName }` |
| `league_joined` | User joins a league | `{ groupId, groupName }` |
| `streak_milestone` | Streak hits 3/5/10/25 | `{ currentStreak, bestStreak }` |
| `level_up` | User levels up | `{ newLevel, levelTitle }` |

### Profile extensions (light)

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio                TEXT,
  ADD COLUMN IF NOT EXISTS favorite_fighter_id UUID REFERENCES fighters(id),
  ADD COLUMN IF NOT EXISTS followers_count    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count    INTEGER NOT NULL DEFAULT 0;
```

Counters updated atomically on follow/unfollow. `bio` and `favorite_fighter_id`
are editable via the existing profile update endpoint.

### RLS

- `user_follows`: users can SELECT own rows; admins can SELECT all. INSERT/DELETE
  server-only (service role).
- `user_activity`: users can SELECT rows for users they follow. INSERT
  server-only. Admins can SELECT all.
- `profiles` new columns: read-public (existing), write-server-only (existing).

## UX

### Follow/Unfollow
- "Seguir" / "Seguindo" toggle button on `/jogador/[nickname]`, league member
  rows, ranking rows.
- Optimistic UI update + debounced POST `/api/follow/[userId]`.
- Counters update immediately client-side.

### Activity Feed ("ATIVIDADE" tab on /home)

Feed renders activity items with:
- Icon/emoji by type (🎯 picks, 🏆 result, ⚔️ challenge, 🏟️ league, 🔥 streak, ⭐ level).
- Player name + action text + relevant detail.
- Relative timestamp (há 2 horas, há 1 dia, 15 de jun).
- Clickable: navigate to event, challenge, league, or user profile.

Paginated: cursor-based, 20 per page. Optional filter: all / picks / challenges.

Empty state: "Siga outros jogadores para ver a atividade deles aqui." with
a suggested users section (recently active, top-ranked).

### Activity generation (server-side hooks)

Each event type calls `logActivity(userId, type, metadata)` at the source:
- Picks submitted: inside `saveMyEventPicks` in `src/server/services/app.ts`.
- Results scored + level up: inside `awardEventXpForAllUsers` in `xp.ts`.
- Streak milestone: inside `recomputeStreakAndLevelForUser` in `xp.ts`
  (when `currentStreak` hits 3/5/10/25).
- Challenge lifecycle: inside `resolveChallengeLifecycle` in `app.ts`.
- League joined: inside `addGroupMember` service in `app.ts`.

Wrapper function in `src/server/services/activity.ts` catches all errors
silently — activity logging must never break the main flow.

### Public profile enhancements
- Bio field (editable, shown on `/jogador/[nickname]`).
- Favorite fighter (shown as "Lutador favorito: Alex Poatan").
- Followers/following counts in the header area.
- XP level and streak already present (from XP system).

## API

### `POST /api/follow/[userId]`
- Toggles follow/unfollow for the authenticated user.
- Returns `{ following: boolean, followersCount, followingCount }`.

### `GET /api/activity`
- Query: `?before=<cursor>&limit=20&type=<filter>`
- Returns `{ items: ActivityFeedItem[], hasMore: boolean, nextCursor: string }`.
- Only includes activity from followed users.
- `ActivityFeedItem` extends `UserActivity` with embedded `profile: { nickname, firstName, lastName }`.

### Profile API extension
- `PUT /api/me` accepts new optional fields: `{ bio?, favoriteFighterId? }`.
- Existing `getPublicProfilePageData` returns `{ bio, favoriteFighterName, followersCount, followingCount }`.

## File Structure

```
supabase/migrations/
  20260622000000_followers_activity.sql       # new

src/server/repositories/
  follows.ts                                  # new
  activity.ts                                 # new

src/server/services/
  follows.ts                                  # new
  activity.ts                                 # new

src/app/api/
  follow/[userId]/route.ts                    # new
  activity/route.ts                           # new

src/components/
  profile/FollowButton.tsx                    # new
  feed/ActivityFeed.tsx                       # new
  feed/ActivityItem.tsx                        # new

src/app/home/page.tsx                         # modify (add ATIVIDADE tab)
src/server/services/app.ts                    # modify (logActivity hooks)
src/server/services/xp.ts                     # modify (activity on result scored + streak + level)
src/server/validators/me.ts                   # modify (add bio, favoriteFighterId)
src/types/index.ts                            # modify (add types)

src/app/jogador/[nickname]/page.tsx           # modify (follow counts, bio, favorite)
src/components/ranking/...                    # modify (follow button on rows)
src/components/groups/...                     # modify (follow button on member list)
```

## Testing

- `tests/unit/follows.test.ts`: follow/unfollow, uniqueness, self-follow blocked,
  counters updated.
- `tests/unit/activity.test.ts`: insertActivity, feed generation filters to
  followed users, pagination.
- `tests/unit/activity-types.test.ts`: each type generates correct metadata shape.

## Scope and Decomposition (~7 tasks)

1. Migration + types.
2. Follows repository + service + API (follow/unfollow, counts).
3. Activity repository + service (insert + logActivity wrapper).
4. Activity generation hooks (wire into picks, results, XP, challenges, leagues).
5. Activity feed API + feed query (GET /api/activity with pagination).
6. FollowButton + ActivityFeed + ActivityItem components + home tab integration.
7. Profile enhancements (bio, favorite fighter, follow counts on public profile).

## Out of Scope (deferred)

- Reactions (like/cheer on activity items).
- Comments on activity items.
- Push notifications for new follows / activity.
- Suggested users algorithm (ML-based).
- Feed ranking/curation.
- Unfollow with feedback ("Why did you unfollow?").
- Blocking/muting users.
