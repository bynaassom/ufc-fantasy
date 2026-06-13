# UFC Fantasy Product Expansion Roadmap

## Product Direction

UFC Fantasy should evolve from a pick'em MVP into the UFC prediction league app for friend groups.

Core loop:

Join league -> make picks -> get results -> share card -> invite friends -> repeat next event.

## Product Pillars

1. Competition
2. Social
3. Shareability
4. Operations

## Confirmed Decisions

- Seasons will be global and league-based.
- Sharing starts with beautiful web share pages, not image generation.
- Chat is for logged-in users only.
- Global Ranking stays important until league usage grows.
- Some product stats should be public.

## Phase 1: Seasons Foundation

### Goals

- Add global seasons.
- Add league seasons.
- Add season standings.
- Preserve existing all-time/global ranking.

### Deliverables

- `seasons`
- `season_events`
- `season_scores`
- `league_seasons`
- `league_season_scores`
- Ranking page: Global / Event / Season
- League page: current season standings

## Phase 2: Public Stats Foundation

### Goals

Show public activity and product momentum.

### Deliverables

- Picks submitted for current event
- Active players this event
- Leagues created
- Challenges completed
- Perfect picks count

## Phase 3: Share Page System

### Goals

Create growth loops through WhatsApp and Instagram sharing.

### Formats

- Instagram Story: vertical 9:16
- WhatsApp: standard horizontal/card layout

### Share Routes

- `/share/picks/[eventSlug]/[nickname]`
- `/share/result/event/[eventSlug]/[nickname]`
- `/share/result/fight/[fightId]/[nickname]`
- `/share/challenge/[challengeId]`

### First Share Pages

1. Event result card
2. Pick card
3. Challenge result card
4. Single fight result card

## Phase 4: League Upgrade

### Goals

Make leagues the future center of the app.

### Deliverables

- Improved league home
- Invite link flow
- Join league after login/register
- League standings
- League season champion
- League recent activity

## Phase 5: Event Recaps

### Goals

Create post-event habit and shareable moments.

### Deliverables

- Event recap page
- League recap section
- Top 3
- Biggest riser
- Biggest faller
- Most perfect picks
- Challenge highlights
- Share recap button

## Phase 6: Notifications

### Goals

Make notifications useful and preference-driven.

### Preference Categories

- Pick reminders
- Results and recaps
- Challenge updates
- League updates
- Achievements
- Chat mentions/replies

### New Notification Types

- `season_started`
- `event_recap_ready`
- `league_rank_changed`
- `share_card_ready`
- `level_up`
- `rivalry_result`
- `chat_mention`

## Phase 7: Chat

### Goals

Add social presence without overbuilding realtime infrastructure.

### Deliverables

- Global chat
- League chat
- Logged-in users only
- Polling first
- Admin moderation tools
- System messages later

## Phase 8: Live Fight Night Mode

### Goals

Make users open the app during events.

### Deliverables

- Live leaderboard
- My live score
- Challenge impact
- Pick distribution
- Fight-by-fight movement
- Polling first

## Phase 9: Profile, Rivalries, Challenges

### Deliverables

- Trophy case
- Public player page upgrade
- Rivalry records
- Challenge templates
- Shareable rivalry/challenge cards

## Phase 10: Admin and Operations

### Deliverables

- Configurable badge criteria
- Archive badges instead of hard delete
- Admin analytics dashboard
- Event/card/result sync polish

## Recommended Implementation Order

1. Seasons foundation
2. Season ranking UI
3. League season standings
4. Public stats foundation
5. Share page system
6. Event result share page
7. Pick share page
8. League invite flow upgrade
9. League home upgrade
10. Event recap
11. Notification preference cleanup
12. Global chat
13. League chat
14. Live fight night MVP
15. Profile trophy case
16. Rivalries
17. Challenge templates
18. Badge criteria/admin archive
19. Analytics dashboard

## First Sprint

### Objective

Build the product foundation and ship one visible growth feature.

### Scope

1. Add season tables.
2. Add active season logic.
3. Backfill/create first season.
4. Calculate global season standings.
5. Add Season tab to Ranking.
6. Add basic public stats for current event.
7. Add share page foundation.
8. Build first event result share page.

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
