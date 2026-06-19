# Next Steps Audit — UFC Fantasy (2026-06-19)

## Purpose

Audit-style review of `improvements` branch to decide what to build/fix next.
Focus is **product features first**, with brief mentions of ops, UX, and
architecture. Not a full design — direction only.

## State Of The App

- `tsc --noEmit` clean. Vitest + Playwright + Supabase + RLS + crons in place.
- `improvements` is 24 commits ahead of `main`, mostly share-card render fixes
  and a "20 critical/high issues" audit pass (`de2bb3c`).
- PWA, web push, share cards (server PNG/JPEG), image proxy, transactional
  result sync RPC all working.
- Roadmap (`docs/product-expansion-roadmap.md`) lists most pillars as
  "Shipped/Partial". Real status: pick'em, ranking, leagues, chat, badges,
  share, recaps, notifications, live mode, admin — running, none fully
  fleshed out.

## Product Principle (Filter)

From `product-expansion-roadmap.md`: every feature must strengthen one of:

- League loop
- Share loop
- Fight night loop
- Recap loop

Every recommendation below is tagged with the loop it serves.

## Hot Spots

| File | Lines | Issue |
|---|---|---|
| `src/server/services/app.ts` | 2,402 | 60+ exported functions, mixed concerns |
| `src/components/admin/tabs/EventsTab.tsx` | 1,951 | 4 sub-tabs, drag-and-drop, bulk ops, edit form in one file |
| `src/lib/ufc-card-sync.ts` | 1,040 | Scraping + transformation + DB writes, hard to test end-to-end |
| `src/components/admin/tabs/FightsTab.tsx` | 1,001 | Same pattern as EventsTab |
| `src/lib/rate-limiter.ts` | 82 | In-memory `Map`, breaks on multi-instance prod |
| `src/app/api/sync-events/route.ts` | 568 | Discovery, sync, verification, fallback, logging all in one route |
| `src/app/api/sync-results/route.ts` | 628 | Same pattern |

## Recommended Feature Order

Sequenced by **user impact x strategic fit x build cost**.

### 1. Chat Moderation UI — *High impact, low cost*

- Why first: roadmap calls it out, RLS already blocks banned users, admin has
  no UI to act on bad messages. Removes a blocker for league growth.
- Scope: admin-only section to list recent/flagged messages, soft-delete
  (`is_hidden`), ban/unban with reason. RLS policy + service layer + admin
  tab. Log every action to audit log.
- Touches: chat repo, new moderation columns, admin tab, audit log.
- Loops served: League, Recap.

### 2. Challenge Templates From Profile — *High impact, medium cost*

- Why: "Challenge" is the only PvP mechanic and currently requires deep
  linking. Templates (e.g., "Pick more winners than me", "Beat my exact
  score") drive viral share.
- Scope: predefined challenge types in `challenges` schema (`type`,
  `criteria`). Templates surfaced on `/jogador/[nickname]` and `/profile`.
  Existing challenge logic stays; templates just preset the form.
- Touches: `challenges` repo, `ChallengesClient` form, profile page, share
  card (item 4).
- Loops served: League, Share.

### 3. League-Specific Recap Sections — *High impact, medium cost*

- Why: `/recap/[slug]` is a single component with no league context. Leagues
  are the retention loop — league-specific recap is the natural post-event
  hook.
- Scope: extend `EventRecapData` with per-league standings for the user's
  leagues. Render "Suas ligas" section in `EventRecapContent`. Recap is
  per-user (no public variants needed).
- Touches: `app.ts` recap data fn, `EventRecapContent`, share card for recap.
- Loops served: Recap, League.

### 4. Challenge + Rivalry Share Cards — *High impact, medium cost*

- Why: roadmap explicitly pending. Existing share infra is mature
  (server-side PNG/JPEG, proxy, PWA). Add two new card templates using the
  same pipeline.
- Scope: `/share/challenge/[id]` and `/share/rivalry/[userA]/[userB]`. Reuse
  `ShareActions` and the server-side render path. Add minimal data fetchers.
- Touches: new routes, `app.ts` share fns, `ShareActions` card variants.
- Loops served: Share, League.

### 5. Live Pick Distribution + Challenge Impact — *Medium impact, high cost*

- Why: roadmap pending. Differentiator during the event. Harder because it
  needs aggregation per fight + active challenge lookup.
- Scope: extend `LiveFeed` to show pick % per side and "your score vs
  opponent's" for active challenges. Reuse polling; SSE later.
- Touches: `LiveFeed`, new repo fn for pick distribution per fight,
  `getEventLiveData` enrichment.
- Loops served: Fight night.

### 6. Notification Type Expansion — *Medium impact, low cost per type*

- Why: push, prefs, dedupe all built. Each new type is a small service fn
  + cron trigger or domain event.
- Scope: add types one at a time. Order by engagement signal:
  - `event_recap_ready` (highest)
  - `league_rank_changed`
  - `chat_mention`
  - `rivalry_result`
  - `level_up`
  - skip `season_started` for now (rare)
- Touches: `notifications.ts` repository, `notifications` cron, prefs UI.
- Loops served: Recap, League, Fight night.

## Deferred Items

- Single-fight share card: low engagement, skip.
- Rate limiter to Redis/KV: important but ops, not features. Do as a small
  isolated PR in parallel.
- `app.ts` decomposition: high cost, no direct user value. Do opportunistically
  when a feature forces a seam.
- `EventsTab.tsx` decomposition: same.
- `ufc-card-sync.ts` decomposition: same, smaller scope.

## Risks

- Share-card pipeline was just heavily debugged (24 commits in a week on
  `improvements`). Item 4 must reuse that pipeline, not fork it. Verify before
  touching.
- The "20 critical/high issues" audit (`de2bb3c`) is recent — don't redo that
  work. Diff against `main` to know what's already fixed.
- In-memory rate limit is a prod risk on Vercel. Vercel KV is a one-PR fix.
- `app.ts` is 2,402 lines but tests pass and tsc is clean — refactor is
  *opportunistic*, not urgent.
- Live mode uses polling. Fine for hundreds of concurrent users; can spike on
  fight night. Note for later.
- PWA icons live in `public/PNG/` (capital PNG). Works but surprising. Cleanup
  one-liner.
- No CI in repo visible. Add a GitHub Action that runs `tsc`, `vitest`,
  `playwright`, `next build` on PR. Cheap win.

## Non-Feature One-Liners

- **Architecture refactor:** decompose `src/server/services/app.ts` into
  `src/server/services/{events,picks,challenges,chat,share,recap,notifications,profile,admin}/`.
  Extract shared types in `src/server/contracts.ts`. Do when a feature forces
  a seam.
- **Ops:** Vercel KV (or Upstash Redis) for rate limit. GitHub Actions for
  CI. Sentry (or equivalent) for error visibility.
- **UX/visual:** recap page is highest-leverage win. Quick wins: empty
  states, loading skeletons, focus rings in admin tabs.
- **Performance:** LiveFeed polling cadence, image proxy caching headers,
  `next/image` for fighter headshots.

## Recommended Next Step

Start with **#1 (chat moderation)** as the first spec/plan. Smallest,
highest-leverage, unblocks the rest. The "spec > plan > implement" cycle will
be fast and build momentum.

Queue up #2 and #3 as the next two designs.

## Open Questions

1. Which feature to start with? #1 is my recommendation, but you might want
   to lead with #2 if growth > safety right now.
2. Are there items I missed that you consider urgent (specific user
   complaints, Vercel billing, an incident)?
3. For #6, which notification type matters most to your engagement numbers?
