# Challenge Templates — Design (2026-06-23)

## Goal

Add one-click challenge creation from profile pages using predefined templates
("Beat my score", "Pick more winners", "Use my picks as answer key"). Drive
viral share through simplified challenge creation. Loops served: League, Share.

## Product Decisions (locked in brainstorming)

- **Templates:** `beat_my_score`, `more_winners`, `use_my_picks`.
- **Entry point:** buttons on `/jogador/[nickname]` profile page.
- **Flow:** click template → pre-filled challenge form → confirm → sent.
- **No new DB tables.** Add `template_type` column to existing `challenges` table.

## Templates

| Type | Button label | Scoring |
|---|---|---|
| `beat_my_score` | Bater minha pontuação | Highest total_points in the event wins |
| `more_winners` | Acerte mais vencedores | Most correct_winners for the event wins |
| `use_my_picks` | Use meus picks como gabarito | Compare picks overlap; highest match count wins |

## Data Model

### Migration

```sql
ALTER TABLE challenges
  ADD COLUMN IF NOT EXISTS template_type TEXT;
```

Values: `null` (manual challenge), `beat_my_score`, `more_winners`, `use_my_picks`.

### Types

```typescript
export type ChallengeTemplateType = "beat_my_score" | "more_winners" | "use_my_picks";
```

### API extension

`POST /api/challenges` accepts optional `template` field:
```typescript
{ challengedId: string, eventId: string, template?: ChallengeTemplateType }
```

## UX

### ChallengeTemplates component on profile

```
┌── Desafiar para... ────────────────────────┐
│ ┌─────────────────────────────────────────┐ │
│ │ 🎯 Bater minha pontuação                │ │
│ │   Quem fizer mais pontos no evento vence│ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 🥊 Acerte mais vencedores               │ │
│ │   Quem acertar mais vencedores vence    │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 📋 Use meus picks como gabarito          │ │
│ │   Meus palpites viram o gabarito        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

- Shown on `/jogador/[nickname]` (public profiles, for authenticated users only).
- Not shown on own profile.
- Each button calls `POST /api/challenges` with the appropriate template and the next upcoming event.
- Toast on success: "Desafio enviado para [nickname]!"
- Existing notification system fires as usual.

## Scoring

### beat_my_score
Existing behavior — challenge resolution compares `total_points` from `event_scores`. No changes needed.

### more_winners
New resolution: on event completion, count `correct_winners` (from XP system metadata or re-compute from picks). Winner = highest count. Needs a small extension to `resolveChallengeLifecycle` for template-aware scoring.

### use_my_picks
New resolution: on event completion, compare both users' picks for the event. Count exact matches (same `picked_winner_id`). Highest match count wins. This is a new scoring function.

## Architecture

### New files
- `src/components/profile/ChallengeTemplates.tsx` — template buttons
- `supabase/migrations/20260623000000_challenge_templates.sql` — add column

### Modified files
- `src/server/validators/challenges.ts` — accept `template` field
- `src/server/services/app.ts` — `createUserChallenge` accepts template, `resolveChallengeLifecycle` handles template-specific scoring
- `src/components/jogador/PublicProfileClient.tsx` — render `<ChallengeTemplates />`
- `src/types/index.ts` — add `ChallengeTemplateType`

### Scoring functions (added to challenge resolution)
- `resolveBeatMyScore(challenge)` — existing points-based comparison
- `resolveMoreWinners(challenge)` — compare `correct_winners` counts
- `resolveUseMyPicks(challenge)` — compare picks overlap count

## Testing
- `tests/unit/challenge-templates.test.ts` — template creation API, template-specific scoring for each type

## Decomposition (~3 tasks)
1. Migration + types + API extension (template param)
2. ChallengeTemplates component + profile integration
3. Template-specific scoring + challenge resolution extension

## Out of Scope (deferred)
- Template share cards (separate spec: Challenge/Rivalry Share Cards)
- Template suggestions based on rivalry history
- Freeform/custom templates
