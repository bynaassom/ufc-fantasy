# UFC Fantasy Product Expansion Roadmap

## Product Direction

UFC Fantasy is evolving from a pick'em MVP into a league-first UFC prediction app for friend groups.

Core loop:

Join league -> make picks -> get results -> share card -> invite friends -> repeat next event.

## Product Pillars

1. Competition
2. Social
3. Shareability
4. Operations

## Current Decisions

- Seasons exist globally and in league standings.
- Share pages exist for picks and event results, with client-side PNG download/share.
- Chat is logged-in only and polling-based.
- Global ranking stays visible while league usage grows.
- Cron automation uses external jobs with bearer secrets.

## Shipped Or Partially Shipped

### Seasons Foundation — Shipped

- `seasons`
- `events.season_id`
- `global_season_standings`
- `group_season_standings`
- Ranking tabs: Global / Event / Season
- League season standings

### Public Stats And League Upgrade — Shipped/Partial

- Product momentum stats in admin/landing contexts
- Leagues/groups with invite links
- Join-after-login invite flow
- League standings and group chat

### Share System — Shipped/Partial

Implemented routes:

- `/share/picks/[slug]/[nickname]`
- `/share/event/[slug]/[nickname]`

Pending/possible:

- Challenge share card
- Single fight result card

### Event Recaps — Shipped/Partial

- Event recap page exists at `/recap/[slug]`
- Top performers and post-event context exist
- Deeper league recap content remains future work

### Notifications — Shipped/Partial

Implemented:

- Pick reminders/open/closed
- Fight/card updates
- Challenge updates
- Perfect pick
- Badge earned
- User preferences
- Web Push subscriptions

Potential future types:

- `season_started`
- `event_recap_ready`
- `league_rank_changed`
- `level_up`
- `rivalry_result`
- `chat_mention`

### Chat — Shipped/Partial

- Global chat
- League chat
- Logged-in users only
- Polling first
- Banned users blocked at RLS/service level
- Admin moderation UI is still pending

### Live Fight Night Mode — Shipped/Partial

- Live leaderboard
- My live score
- Fight-by-fight feed
- Polling first

Pending:

- Pick distribution
- Challenge impact visualization

### Profile, Rivalries, Badges — Shipped/Partial

- Trophy case
- Public player pages
- Rivalry records
- Badge archive/admin criteria text

Pending:

- Challenge templates
- Rivalry/challenge share cards

### Admin And Operations — Shipped/Partial

- Badge archive
- Admin analytics
- Audit logs
- Event/card/result sync polish
- UFCStats discovery
- Transactional result sync RPC
- Cron endpoints for events, notifications, card verification and results

## Recommended Next Work

1. Add chat moderation UI.
2. Add challenge templates from player/profile pages.
3. Expand event recaps with league-specific recap sections.
4. Add share cards for challenges/rivalries.
5. Improve live mode with pick distribution and challenge impact.
6. Move rate limiting to Redis/Vercel KV for multi-instance production.

## Success Metrics

- Users making picks per event
- League invites clicked
- League joins
- Share page views
- Share button clicks
- Returning users per event
- Recap page views
- Challenge creation rate

## Product Principle

Do not add isolated features. Every feature must strengthen one of these loops:

- League loop
- Share loop
- Fight night loop
- Recap loop
