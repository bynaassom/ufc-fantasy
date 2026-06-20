# League Recap Sections — Design (2026-06-22)

## Goal

Add per-event league standings to the `/recap/[slug]` page so users see
how they and their league mates performed after each event. Loops served:
Recap, League.

## Product Decisions (locked in brainstorming)

- **Scope:** per-event league standings on `/recap/[slug]`.
- **Display:** detailed table (position, name, total points, event XP, movement).
- **Data source:** compute from existing `event_scores`, `group_members`,
  `groups` tables. No new schema tables needed.
- **Position movement:** compare current event standings with the previous
  completed event's standings.

## Data Model

No new database tables. All computed from existing:

- `groups` + `group_members` — user's league membership
- `event_scores` — per-user per-event total points
- `profiles` — member names

### Types

```typescript
export interface LeagueRecapMember {
  position: number;
  userId: string;
  name: string;
  nickname: string;
  totalPoints: number;
  eventXp: number;
  movement: "up" | "down" | "same" | "new";
  movementDelta: number; // positions gained/lost (0 for same/new)
  isCurrentUser: boolean;
}

export interface LeagueRecapStanding {
  groupId: string;
  groupName: string;
  members: LeagueRecapMember[];
}
```

### Movement computation

- Get all members' total_points for the current event.
- Get all members' total_points for the previous completed event.
- Sort both by total_points DESC → rank.
- Movement = current_rank - previous_rank:
  - Negative = up (moved up N positions)
  - Positive = down (moved down N positions)
  - Zero = same
  - No previous event or new member = "new" (shows "novo")

## UX

### Placement

Bottom of `/recap/[slug]` page, below existing recap content (top
performers, XP section, next event link).

### Section per league

```
┌── SUAS LIGAS ──────────────────────────────────┐
│                                                  │
│ ┌ Liga "Bonde do UFC" ─────────────────────────┐│
│ │ # │ Jogador    │ Pts  │ Evento │ Mov        ││
│ │───│────────────│──────│────────│────────────││
│ │ 1 │ Maria      │ 850  │ +159   │ =          ││
│ │ 2 │ Joao       │ 720  │ +130   │ 🔺1 (+1)   ││
│ │ 3 │ Ana        │ 610  │ +100   │ 🔻1 (-1)   ││
│ │→4 │ Voce       │ 595  │ +159   │ 🔺3 (+3)   ││
│ │ 5 │ Pedro      │ 480  │ +90    │ 🔻1 (-1)   ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ ... more leagues ...                             │
└──────────────────────────────────────────────────┘
```

- User's row: `→` indicator + slight background tint (`rgba(239,68,68,0.05)`).
- Movement: 🔺N (gained), 🔻N (lost), = (same), "novo" (new).
- "Pts" = all-time points from event_scores aggregation (or current season).
- "Evento" = XP earned in THIS event (from XP system or event_score).
- League name links to `/ligas` or the league page.

### Edge cases

- **Anonymous user:** section not shown.
- **User in no leagues:** section not shown.
- **First event (no previous):** all members show "novo" for movement.
- **Single-member league:** still shows the user's row.
- **Member left the league:** not included (group_members filters).

## Architecture

### New files

- `src/server/repositories/league-recap.ts` — `getGroupMembers`, `getMemberEventScore`,
  `getPreviousCompletedEventId`.
- `src/server/services/league-recap.ts` — `computeLeagueRecap` (orchestrates):
  `getUserLeagues` → per league: `computeStandings`.
- `src/components/recap/LeagueRecapSection.tsx` — renders one card per league.

### Modified files

- `src/server/services/app.ts` — extend `getEventRecapData(slug)`:
  - If user authenticated: call `computeLeagueRecap(user.id, event.id)`, append to return.
  - Update `EventRecapData` type to include `leagueStandings?: LeagueRecapStanding[]`.
- `src/components/recap/EventRecapContent.tsx` — import and render `<LeagueRecapSection>`.
- `src/types/index.ts` — add `LeagueRecapMember`, `LeagueRecapStanding` types.

### Data flow

```
User opens /recap/[slug] (authenticated)
  → getEventRecapData(slug)
    → existing: top performers, XP, next event
    → NEW: computeLeagueRecap(userId, eventId)
      → getUserLeagues(userId) from group_members
      → for each league:
        → getMembers(groupId) from group_members + profiles
        → getEventScores(members, eventId) from event_scores
        → getPreviousCompletedEventId(eventId) from events table
        → getEventScores(members, prevEventId) if exists
        → compute positions + movements
      → return LeagueRecapStanding[]
    → return EventRecapData { ...existing, leagueStandings }
  → Render: EventRecapContent
    → existing sections
    → LeagueRecapSection { standings }
```

### Error handling

- League computation failure: log to activity_logs, return empty `leagueStandings: []`,
  do NOT break the recap page.
- No previous event: all members get movement "new".

## Testing

- `tests/unit/league-recap.test.ts`:
  - Position ranking by totalPoints DESC.
  - Movement: up (negative delta), down (positive), same (0), new (no prev score).
  - Empty league returns empty array.
  - First event (no previous) returns all "new".
  - Ties in points: stable sort by name.

## Scope and Decomposition (~4 tasks)

1. Types + repository (query group members, event scores, previous event).
2. Service (compute standings with position + movement) + extend `getEventRecapData`.
3. `LeagueRecapSection` component (responsive table).
4. Wire into `EventRecapContent` + integration test.

## Out of Scope (deferred)

- Season standings recap (final season page).
- League comparison across events (season chart).
- Anonymous/vistor league recap (public leagues only).
- League recap share card.
- Notification when league recap is ready.
