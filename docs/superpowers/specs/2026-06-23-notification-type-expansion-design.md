# Notification Type Expansion — Design (2026-06-23)

## Goal

Add 5 new notification types to the existing notification system
(event_recap_ready, league_rank_changed, chat_mention, rivalry_result,
level_up), each with dedupe keys, messages, triggers, and preference
toggles. Loops served: Recap, League, Fight night.

## Types, Triggers, Messages

| Type | Trigger point | Dedupe key | Message |
|---|---|---|---|
| `event_recap_ready` | Event completed + XP awarded | `user_id::event_id::recap_ready` | "O recap do {eventName} esta pronto!" |
| `league_rank_changed` | Position changed in league recap | `user_id::group_id::event_id::rank_changed` | "Voce {subiu/desceu} para {pos}o lugar em {groupName}!" |
| `chat_mention` | @nickname pattern in chat message | `user_id::message_id::mention` | "{sender} mencionou voce no chat!" |
| `rivalry_result` | Challenge completed | `user_id::challenge_id::rivalry_result` | "Desafio contra {opponent}: {won/lost/draw}!" |
| `level_up` | XP level increased | `user_id::newLevel::level_up` | "Voce subiu para {levelTitle}!" |

## Migration

```sql
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS event_recap     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS league_rank     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS chat_mention    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rivalry_result  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS level_up        BOOLEAN NOT NULL DEFAULT true;
```

## Service functions

Each type has a dedicated dispatch function:

- `notifyEventRecapReady(userId, eventName, eventSlug)` — target `/recap/[slug]`
- `notifyLeagueRankChanged(userId, groupId, groupName, oldPos, newPos, eventSlug)` — target `/ligas`
- `notifyChatMention(mentionedUserId, senderNickname, groupId?)` — target `/bate-papo`
- `notifyRivalryResult(userId, opponentNickname, result, challengeId)` — target `/desafios`
- `notifyLevelUp(userId, newLevel, levelTitle)` — target `/profile`

All use existing `createNotification` with `dedupeKey`, `title`, `body`, and `targetPath`.

## Triggers

- `event_recap_ready`: in `awardEventXpForAllUsers` in `xp.ts`
- `league_rank_changed`: in `computeLeagueRecap` in `league-recap.ts`
- `chat_mention`: in `insertMessage` in `chat.ts`
- `rivalry_result`: in `resolveChallengeLifecycle` in `app.ts`
- `level_up`: in `recomputeStreakAndLevelForUser` in `xp.ts`

## Preference Toggles

Extend existing notification preferences UI with 5 new toggles:
- "Recap de evento" (event_recap)
- "Mudanca de posicao na liga" (league_rank)
- "Mencoes no chat" (chat_mention)
- "Resultado de desafio" (rivalry_result)
- "Subiu de nivel" (level_up)

All default `true` (opt-out).

## File Structure

```
supabase/migrations/20260623000001_notification_types.sql  # new
src/lib/notification-messages.ts                            # new

src/server/services/notifications.ts                        # modify
src/server/repositories/notifications.ts                    # modify
src/server/services/xp.ts                                   # modify
src/server/services/league-recap.ts                         # modify
src/server/repositories/chat.ts                             # modify
src/server/services/app.ts                                  # modify
src/components/notifications/*                               # modify (preference toggles)
```

## Testing

- `tests/unit/notification-types.test.ts` — each type creates correct dedupe key, message, and target path.

## Decomposition (~2 tasks)

1. Migration + service/repo functions + triggers (all 5 types wired).
2. Preference toggles UI extension.

## Out of Scope

- `season_started` (rare event, deferred).
- `new_follower` notification.
- Notification grouping/throttling.
