# Notificacoes de Picks e Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build in-app and browser push notifications for picks and card updates.

**Architecture:** Extend the existing `notifications` table and bell UI, add Web Push subscriptions, centralize notification generation in a server service, and trigger scheduled pick reminders through a protected cron route. Card update notifications are emitted from existing admin card mutation flows.

**Tech Stack:** Next.js App Router, Supabase, Vitest, Web Push API, `web-push`.

---

### Task 1: Notification Rules and Copy

**Files:**
- Create: `src/lib/notifications.ts`
- Test: `tests/unit/notifications.test.ts`

- [ ] Write tests for reminder windows, playful messages, and non-picker filtering helpers.
- [ ] Run `npm test -- tests/unit/notifications.test.ts` and confirm the tests fail because the module does not exist.
- [ ] Implement pure helpers for notification types, copy, dedupe keys, and due reminder windows.
- [ ] Run `npm test -- tests/unit/notifications.test.ts` and confirm the tests pass.

### Task 2: Database and Repositories

**Files:**
- Create: `supabase/migrations/20260502120000_notifications_push.sql`
- Modify: `src/server/repositories/notifications.ts`
- Create: `src/server/repositories/push-subscriptions.ts`
- Modify: `src/types/index.ts`

- [ ] Add enum values, event/fight/dedupe columns, indexes, and `push_subscriptions`.
- [ ] Add repository helpers for active recipients, missing-pick recipients, notification upsert, and push subscription CRUD.

### Task 3: Server Notification Service

**Files:**
- Create: `src/server/services/notifications.ts`
- Modify: `src/server/services/app.ts`
- Test: `tests/unit/notification-service.test.ts`

- [ ] Write tests for creating in-app notifications without configured push and for filtering recipients without confirmed picks.
- [ ] Implement Web Push setup, payload delivery, invalid subscription cleanup, and event/card notification helpers.

### Task 4: APIs and Browser Push Client

**Files:**
- Create: `src/app/api/me/push-subscriptions/route.ts`
- Create: `src/app/api/push/vapid-public-key/route.ts`
- Create: `src/app/api/cron/notifications/route.ts`
- Create: `public/sw.js`
- Create: `public/manifest.webmanifest`
- Create: `src/components/layout/PushNotificationManager.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/layout/Navbar.tsx`

- [ ] Add authenticated subscription APIs.
- [ ] Add a protected cron endpoint for due pick reminders.
- [ ] Register the service worker and ask notification permission from logged-in users.

### Task 5: Admin Integration

**Files:**
- Modify: `src/server/services/app.ts`
- Modify: `src/app/api/update-card/route.ts`
- Modify: `src/app/api/admin/events/[id]/route.ts`
- Modify: `src/app/api/admin/events/[id]/fights/route.ts`
- Modify: `src/app/api/admin/fights/[fightId]/route.ts`

- [ ] Emit picks-open notifications when an admin opens picks immediately.
- [ ] Emit fight-added and fight-removed notifications for manual changes.
- [ ] Emit card-update notifications after sync diffs are applied.

### Task 6: Verification

**Files:**
- All changed files.

- [ ] Run focused unit tests.
- [ ] Run full `npm test`.
- [ ] Run `npm run build`.
