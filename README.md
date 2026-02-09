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

## Reachability Tuner

Evaluate/tune question weights to maximize class reachability based on result conditions:

```bash
npm run tune:reachability
```

Apply tuned weights back into `data/questions.json` (creates backup first):

```bash
npm run tune:reachability:apply
```

Tune for both 100% reachability and balanced class probabilities:

```bash
npm run tune:balance
```

Apply balanced tuning result:

```bash
npm run tune:balance:apply
```

Useful flags:

- `--target-reachability 1` (or `100`) for 100% goal
- `--timeout-ms 3600000` for long runs
- `--workers 0` to auto-use CPU cores (`N-1`)
- `--search-iterations`, `--search-restarts` for deeper per-class search
- `--weight-mutation-count`, `--weight-mutation-step`, `--weight-limit` for mutation behavior
- `--optimize-probability` to include class outcome distribution tuning
- `--target-probability 6.25` for equal per-class target (percent or ratio accepted)
- `--target-probabilities class_a=8,class_b=5,...` for per-class targets by id
- `--probability-samples 40000` for Monte Carlo distribution estimates
- `--probability-tolerance 1` acceptable max deviation from target (percent or ratio)

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

- `/` landing page with `Start Adventure` door animation
- `/dimensions` explanation of all 8 dimensions and their low/high trait scales
- `/quiz` quiz UI (20 questions, each supports optional image)
- `/result` result from latest attempt
- `/result?seed=demo` deterministic debug seed run
- `/cards` class card browser (`Single` and `All` views)
- `/card/:id` standalone 900x1400 card renderer (used by export script)

On GitHub Pages, these are accessed with hash URLs (example: `/#/result?seed=demo`).

## Data

- `data/dimensions.json`
  - source of dimension labels, descriptions, and low/high trait terms
- `data/questions.json`
  - 20 questions
  - each question has 4 options with weighted dimension deltas + `image` field
- `data/results.json`
  - 16 class definitions (`title`, optional `classSprite`, `tagline`, `summary`, `lore`, `traits`, `style`, `risk`, `partyRole`, `growthQuest`, `signatureItem`, `battleHabit`, `priority`, `conditions`)

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
- `src/lib/data.ts`
  - ensures `showcaseScores` is not pre-defined in result data

## UI Components

- `src/components/ResultCard.tsx`: premium 900x1400 ornate card
- `src/components/StatBar.tsx`: centered zero stat bars with fixed ticks
- `src/components/DebugPanel.tsx`: debug toggle showing scores/ranks/condition pass-fail

## PNG Export Details

- `scripts/export.ts` launches a local Vite server, opens `/#/card/:id?export=1`, and captures PNG via Playwright.
- Viewport is exactly `900x1400`.
- Capture uses `omitBackground: true` for transparency outside the rounded card.
