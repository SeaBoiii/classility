# Classility: RPG Classes Personality Test

Fantasy-themed interactive personality quiz with deterministic 16-class evaluation and collectible PNG card export.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- React Router
- Playwright (PNG export CLI)

## Quick Start

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Export Commands

Single class card:

```bash
npm run export -- --id class_spellblade
```

Export all 16 class cards:

```bash
npm run export:all
```

First-time Playwright setup on a machine:

```bash
npx playwright install chromium
```

Generated images go to `out/`.

## GitHub Pages Deployment

This project is configured for GitHub Pages:

- Uses `HashRouter` so route refreshes work on Pages.
- Uses dynamic Vite `base` during GitHub Actions builds (`/<repo-name>/`).
- Includes workflow: `.github/workflows/deploy-pages.yml`.

Enable once in repository settings:

1. Open GitHub repo `Settings` -> `Pages`.
2. Set `Source` to `GitHub Actions`.
3. Push to `main` (or run the workflow manually).

## Routes

- `/` quiz UI (20 questions)
- `/result` result from latest attempt
- `/result?seed=demo` deterministic debug seed run
- `/card/:id` standalone 900x1400 card renderer (used by export script)

On GitHub Pages, these are accessed with hash URLs (example: `/#/result?seed=demo`).

## Data

- `data/questions.json`
  - 8 dimensions
  - 20 questions
  - each question has 4 options with weighted dimension deltas
- `data/results.json`
  - 16 classes
  - each result includes `priority` + AND-ed `conditions`
  - includes flavor metadata used in the collectible card

## Scoring + Evaluator

- `src/lib/scoring.ts`
  - sums weights from selected options
  - clamps each dimension to `[-20, 20]`
  - computes ranks with stable tie-break by dimension order
  - computes totals, spread, top/second dims
- `src/lib/evaluator.ts`
  - implements all condition operators:
    - `min`, `max_le`, `max_ge`
    - `diff_greater`, `diff_abs_lte`
    - `top_is`, `not_top_is`
    - `rank_is`
    - `top_diff_gte`, `top_diff_lte`
    - `total_min`, `total_max`
    - `sum_min`, `sum_max`
    - `spread_between`
  - requires every condition in a result to pass (AND)
  - selects winner by `priority` descending; ties by file order in `results.json`

## UI Components

- `src/components/ResultCard.tsx`: premium 900x1400 ornate card
- `src/components/StatBar.tsx`: centered zero stat bars with fixed ticks
- `src/components/DebugPanel.tsx`: debug toggle showing scores/ranks/condition pass-fail

## PNG Export Details

- `scripts/export.ts` launches a local Vite server, opens `/#/card/:id?export=1`, and captures PNG via Playwright.
- Viewport is exactly `900x1400`.
- Capture uses `omitBackground: true` for transparency outside the rounded card.
