# Challenge Share Cards — Design (2026-06-23)

## Goal

Add shareable cards for challenge creation and challenge results, reusing
the mature existing share pipeline (server-rendered DOM → canvas capture →
PNG/JPEG → WhatsApp/Web Share API). Loops served: Share, League.

## Product Decisions (locked in brainstorming)

- **Cards:** Challenge Created (right after sending) + Challenge Result
  (after completion).
- **Pipeline:** reuse existing `/share/*` pattern — `ShareActions` component
  for capture, server-side data fetcher, server-rendered page.
- **No new DB tables.**

## Cards

### Challenge Created

Shown after a user creates a challenge via templates or manual flow.

```
┌──────────────────────────────────────┐
│ ⚔️ DESAFIO LANCADO                   │
│                                      │
│ João desafiou Maria                  │
│ para o UFC 303!                      │
│                                      │
│ 🎯 Bater minha pontuação              │
│   Quem fizer mais pontos vence       │
│                                      │
│ 🌐 ufc-fantasy.app/desafios/[id]     │
└──────────────────────────────────────┘
```

### Challenge Result

Shown after challenge completion/resolution.

```
┌──────────────────────────────────────┐
│ 🏆 DESAFIO COMPLETO                   │
│                                      │
│ João 850 × 720 Maria                 │
│ João venceu!                         │
│ UFC 303                              │
│                                      │
│ 🎯 Bater minha pontuação              │
│                                      │
│ 🌐 ufc-fantasy.app/desafios/[id]     │
└──────────────────────────────────────┘
```

## Architecture

### Reuse the existing pipeline exactly

```
Browser → /share/challenge/[id] → server renders HTML
  → ShareActions captures DOM to canvas → PNG/JPEG → share
```

Same as `/share/picks/[slug]/[nickname]` and `/share/event/[slug]/[nickname]`.
No changes to `ShareActions` or the capture logic.

### New files

- `src/app/share/challenge/[id]/page.tsx` — share page
- `src/components/share/ChallengeShareCard.tsx` — rendered DOM card (for canvas capture)
- `src/components/share/ChallengeSharePage.tsx` — full page with ShareActions

### Modified files

- `src/server/services/app.ts` — add `getPublicChallengeShareData(id)`
- `src/types/index.ts` — add `ChallengeShareData`

### Data flow

```
getPublicChallengeShareData(challengeId)
  → read challenge row (INNER JOIN with profiles for both users + events)
  → return { challenge, challenger, challenged, event, template_type, result }
  → page component renders accordingly
```

No auth required for viewing — public share URL.

## UI Entry Points

- After challenge creation: toast with "Compartilhar" button linking to
  `/share/challenge/[id]`.
- Challenge detail page: "Compartilhar" button.
- Activity feed item for challenge: "Compartilhar" link.

## Testing

- `tests/unit/challenge-share.test.ts` — data fetch returns correct shape,
  handles missing challenge gracefully.

## Decomposition (~2 tasks)

1. Data fetcher (`getPublicChallengeShareData`) + page route + types.
2. `ChallengeShareCard` + `ChallengeSharePage` components + capture integration.

## Out of Scope (deferred)

- Rivalry record share card.
- Challenge share card with animated/gradient background (keep simple).
- Auto-generated share image on challenge creation.
