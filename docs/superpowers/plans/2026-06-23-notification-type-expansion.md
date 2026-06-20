# Notification Type Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 new notification types (event_recap_ready, league_rank_changed, chat_mention, rivalry_result, level_up) with dedupe keys, messages, triggers, and preference toggles.

**Architecture:** Migration adds 5 preference columns. New notification dispatch functions in notifications service. Triggers wired into existing flows. Preference toggles added to UI.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, Supabase, vitest

## Global Constraints

- Reuse existing notification infrastructure (dedupe keys, Web Push, cron delivery).
- All 5 types default `true` (opt-out).
- Banned users excluded from all notification types (existing pattern).
- Pt-BR messages.

---

### Task 1: Migration + service functions + triggers

**Files:**
- Create: `supabase/migrations/20260623000001_notification_types.sql`
- Modify: `src/server/services/notifications.ts` — add 5 dispatch functions
- Modify: `src/server/services/xp.ts` — trigger event_recap_ready + level_up
- Modify: `src/server/services/league-recap.ts` — trigger league_rank_changed
- Modify: `src/server/repositories/chat.ts` — trigger chat_mention
- Modify: `src/server/services/app.ts` — trigger rivalry_result
- Modify: `src/server/repositories/notifications.ts` — extend shouldNotifyUser for new types
- Test: `tests/unit/notification-types.test.ts`

- [ ] **Step 1: Create migration**

```sql
ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS event_recap     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS league_rank     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS chat_mention    BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rivalry_result  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS level_up        BOOLEAN NOT NULL DEFAULT true;
```

- [ ] **Step 2: Add dispatch functions to notifications service**

```typescript
// src/server/services/notifications.ts — append
export async function notifyEventRecapReady(
  userId: string,
  eventName: string,
  eventSlug: string,
) {
  try {
    const admin = await getAdminSupabase();
    if (!(await shouldNotifyUser(admin, userId, "event_recap"))) return;
    await createNotification(admin, {
      user_id: userId,
      type: "event_recap_ready",
      title: "Recap pronto!",
      body: `O recap do ${eventName} esta pronto! Veja como voce e suas ligas foram.`,
      dedupe_key: `${userId}::${eventSlug}::recap_ready`,
      target_path: `/recap/${eventSlug}`,
    });
  } catch { /* silent */ }
}
```

Repeat pattern for: `notifyLeagueRankChanged`, `notifyChatMention`, `notifyRivalryResult`, `notifyLevelUp` with appropriate dedupe keys and messages from the spec.

- [ ] **Step 3: Wire triggers**

In each source file, add the dispatch call at the appropriate point:
- `xp.ts`: after event XP awarded → `notifyEventRecapReady`
- `xp.ts`: after level recomputed → `notifyLevelUp` (if level changed)
- `league-recap.ts`: after standings computed → `notifyLeagueRankChanged` (if position changed)
- `chat.ts`: after message inserted → check for `@nickname` → `notifyChatMention`
- `app.ts`: after challenge resolved → `notifyRivalryResult`

All in try/catch. All silent.

- [ ] **Step 4: Write tests**

```typescript
// tests/unit/notification-types.test.ts
describe("notification types", () => {
  it("notifyEventRecapReady creates correct dedupe key", async () => {});
  it("notifyLeagueRankChanged includes position delta", async () => {});
  it("notifyChatMention resolves mentioned user by nickname", async () => {});
  it("notifyRivalryResult includes win/loss/draw", async () => {});
  it("notifyLevelUp sends with correct level title", async () => {});
});
```

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add <all modified files>
git commit -m "feat(notif): 5 new notification types with triggers"
```

---

### Task 2: Preference toggles UI

**Files:**
- Read: `src/components/notifications/` (find the existing preferences component)
- Modify: add 5 new toggle checkboxes

**Interfaces:**
- Consumes: new preference columns
- Produces: preference toggle UI

- [ ] **Step 1: Find and extend preferences UI**

Read the existing notification preferences component. Find the section with checkboxes/toggles. Add 5 new entries:

```tsx
{ label: "Recap de evento", field: "event_recap" },
{ label: "Mudanca de posicao na liga", field: "league_rank" },
{ label: "Mencoes no chat", field: "chat_mention" },
{ label: "Resultado de desafio", field: "rivalry_result" },
{ label: "Subiu de nivel", field: "level_up" },
```

The existing component likely reads/writes `notification_preferences` via an API. Ensure the new fields are included in the GET/PUT flow.

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit && npx vitest run`

```bash
git add <preferences UI file>
git commit -m "feat(notif): preference toggles for 5 new notification types"
```

---

### Final Verification

- [ ] Run `npx tsc --noEmit`
- [ ] Run `npx vitest run`
- [ ] Run `npm run build`
