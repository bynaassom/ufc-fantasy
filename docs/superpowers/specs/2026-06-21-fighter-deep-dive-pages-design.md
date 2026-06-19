# Fighter Deep-Dive Pages — Design (2026-06-21)

## Goal

Add dedicated fighter pages and compact stats panels to help users make better
picks (pick helper) and browse fighter data (content/entertainment). Loops
served: Fight night, Recap.

## Product Decisions (locked in brainstorming)

- **Primary purpose:** both pick helper (compact panel near fights) and
  content/entertainment (full profile page).
- **Data source:** existing `fighters` table enriched with UFCStats scraping;
  form computed from existing fight data.
- **Key metrics:** core fighting stats (record, striking, grappling, physical,
  form).
- **Architecture:** enrich the existing `fighters` table (Approach A) — fast
  reads, simple schema, batch scrape via cron.

## Data Model

### New columns on `fighters` table

```sql
ALTER TABLE fighters
  ADD COLUMN IF NOT EXISTS slug                TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS record_wins         INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS record_losses       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS record_draws        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS height_cm           INTEGER,
  ADD COLUMN IF NOT EXISTS reach_cm            INTEGER,
  ADD COLUMN IF NOT EXISTS stance              TEXT,
  ADD COLUMN IF NOT EXISTS striking_accuracy   NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS takedown_accuracy   NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS takedown_avg        NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS submission_avg      NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS stats_updated_at    TIMESTAMPTZ;
```

All new columns are nullable or have safe defaults — existing rows survive
the migration with no backfill needed.

### Slug generation

A pure function `generateFighterSlug(name: string): string` that:
- Lowercases
- Removes accents (normalize NFD, strip diacritics)
- Replaces any non-alphanumeric chars with hyphens
- Collapses multiple hyphens
- Trims leading/trailing hyphens

Called on every fighter create/update. Stored in `fighters.slug UNIQUE`.

### Derived data (computed, not stored)

- **Form:** last 5 completed fights for the fighter (from `fights` joined
  with `events`). Fields: result (W/L/D), opponent name, method, round, event
  name, event date.
- **Pick stats:** aggregated from `event_picks` joined with `fights`:
  `pick_rate` (percentage of events this fighter was picked), `win_when_picked`
  (fighter's win rate when chosen), `total_events_picked` (count).

### Scraper

- New module: `src/lib/ufc-fighter-stats-scraper.ts`
- Parses HTML from UFCStats.com/fighter-profile/[id]
- Extracts: striking accuracy, takedown accuracy, takedown avg, submissions
  avg, height, reach, stance, record.
- Rate-limited: 2s delay between requests.
- Runs via: admin manual trigger or cron (POST /api/admin/scrape-fighter-stats).
- Stale after 30 days (stats_updated_at check).

## UX

### Surface 1: Compact stats panel (pick helper)

Shown inline on fight cards. Layout per fighter:

```
Name · Age · Country | Stance · Height · Reach
Record: W-L-D
Striking: X/min · X% acc | Takedowns: X avg · X% acc
Últimas 5: 🟢🟢🔴🟢🟢
Fantasy: X% pick rate · X% win when picked
```

- Trigger: click fighter name in FightCard, or dedicated "Stats" button.
- Enhances existing `FightStatsCompare.tsx` with the new fields.
- No navigation away from pick flow. Overlay or inline expansion.

### Surface 2: Full profile page (`/lutador/[slug]`)

Sections:
1. **Hero:** fighter headshot, full name, nickname, weight class, country, age.
2. **Record bar:** W / L / D counts.
3. **Stats grid:** striking accuracy, strikes/min, takedown accuracy, takedown
   avg, submission avg, height, reach, stance. Shows "—" for missing data.
4. **Form timeline:** last 5 fights, chronological. Shows result (W/L),
   opponent, method+round, event, date. Green/red dots for W/L.
5. **Fantasy stats:** pick rate, win-when-picked, total events picked.
6. **XP level** if the fighter has a user account linked (future).

### Navigation

- FightCard: fighter name → compact panel; "Ver perfil" link → profile page.
- FighterStatsCompare: "Ver perfil" link.
- Ranking: fighter names → compact panel or profile (click threshold TBD).
- Search (`/api/fighter-search`): results return slug.
- Admin: fighter links go to profile.

## API

### `GET /api/fighter/[slug]`

Returns `FighterProfile`:
```typescript
{
  fighter: FighterWithStats;     // DB row + new columns
  form: FighterFormEntry[];      // last 5 fights
  pickStats: FighterPickStats;   // aggregated
}
```

### `POST /api/admin/scrape-fighter-stats`

Body (optional): `{ fighterId?: string }`
- With `fighterId`: scrapes only that fighter.
- Without: scrapes all fighters with stale stats (older than 30 days or null).
- Admin-only, audit-logged.

## File Structure

```
supabase/migrations/
  20260621000000_fighter_stats_and_slug.sql    # new

src/lib/
  ufc-fighter-stats-scraper.ts                 # new
  generate-fighter-slug.ts                     # new (pure)

src/server/repositories/
  fighter-stats.ts                             # new

src/server/services/
  fighter-stats.ts                             # new

src/app/
  lutador/[slug]/page.tsx                      # new
  api/fighter/[slug]/route.ts                  # new
  api/admin/scrape-fighter-stats/route.ts      # new

src/components/fighter/
  FighterProfileClient.tsx                     # new
  FighterCompactPanel.tsx                      # new
  FighterFormTimeline.tsx                      # new
  FighterStatsGrid.tsx                         # new

src/components/event/
  FightCard.tsx                                # modify (add name links + panel)
  FightStatsCompare.tsx                        # modify (enrich with new stats)

src/types/index.ts                             # modify (add types)
```

## Testing

- `tests/unit/generate-fighter-slug.test.ts`: accent removal, whitespace,
  special chars, duplicates.
- `tests/unit/ufc-fighter-stats-scraper.test.ts`: HTML parsing extracts correct
  values, handles missing fields.
- `tests/unit/fighter-stats.test.ts`: form computation (last 5, correct order),
  pick stats aggregation.
- Integration: `/lutador/[slug]` 200/404, stats scraping endpoint auth.

## Scope and Decomposition

This spec covers fighter deep-dive pages in one slice. Decomposed into ~7 tasks:

1. Migration + slug generation.
2. Types + scraper module.
3. Repository + service (stats read, form compute, pick stats).
4. API routes (fighter profile GET, admin scrape POST).
5. Fighter profile page (/lutador/[slug]).
6. Compact stats panel + FightCard/FightStatsCompare enrichment.
7. Admin scrape integration (cron or manual trigger).

## Out of Scope (deferred)

- Video highlights embedding (needs media URLs, possibly from YouTube/UFC).
- Fighter news feed (needs an external news API or RSS).
- Fighter comparison tool (beyond existing FightStatsCompare).
- XP integration with fighters (only relevant if fighters have user accounts).
- Injury/roster status tracking.
- Automated cron for periodic scraping (v1 is admin-triggered).
