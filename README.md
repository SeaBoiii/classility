# Classility: RPG Class Personality Quiz

Classility is a fantasy-themed quiz app that maps player choices to RPG class archetypes and renders a high-fidelity result card (web + PNG export).

## Features

- Landing page with animated inward-opening doors and direct transition into quiz.
- 20-question RPG quiz with optional scene image per question.
- Smooth fade question transition between answers.
- Deterministic class evaluation using weighted dimensions + rule conditions.
- Rich result card with lore, stat profile, party role, growth quest difficulty, crest/equipment art, and animated title treatment.
- Built-in PNG export pipeline for class cards (`900x1400`).
- Result route guard: users with no saved attempt are redirected to landing page.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS
- React Router (`HashRouter` for GitHub Pages compatibility)
- Playwright (card export automation)

## Quick Start

```bash
npm install
npm run dev
```

Build and lint:

```bash
npm run build
npm run lint
```

## Routes

- `/#/` landing page
- `/#/quiz` quiz flow
- `/#/result` latest result (redirects to landing if no attempt exists)
- `/#/result?seed=demo` deterministic seeded result for debugging
- `/#/cards` class card browser
- `/#/card/:id` standalone card renderer (used by export script)

## Data Model

### `data/dimensions.json`

Defines scoring axes:

- `id`
- `label`
- `left` / `right`
- optional `description`

### `data/questions.json`

Defines quiz content:

- `id`
- `prompt`
- optional `image` (resolved from `src/assets/scenes/`)
- `options` (must be exactly 4)
- per-option `weights` keyed by dimension id

### `data/results.json`

Defines class outputs and evaluator rules:

- Core identity: `id`, `title`, `tagline`, `summary`, `lore`, optional `lore2`
- Visuals: `classSprite`, `partyRoleCrest`, `signatureEquipment`
- Meta flavor: `traits`, `style`, `risk`, `partyRole`, `growthQuest`, `growthQuestDifficulty`, `signatureItem`, `battleHabit`
- Matching: `priority`, `conditions`, optional `isFallback`

`src/lib/data.ts` resolves asset filenames against:

- `src/assets/class_sprites/`
- `src/assets/scenes/`
- `src/assets/crests/`
- `src/assets/equipments/`

## Evaluation Rules

Scoring and matching live in:

- `src/lib/scoring.ts`
- `src/lib/evaluator.ts`

Supported condition operators:

- `min`, `max_le`, `max_ge`
- `diff_greater`, `diff_abs_lte`
- `top_is`, `not_top_is`
- `rank_is`
- `top_diff_gte`, `top_diff_lte`
- `total_min`, `total_max`
- `sum_min`, `sum_max`
- `spread_between`

Selection behavior:

- All conditions in a class must pass.
- Passing non-fallback classes are ranked by `priority` (desc), then file order.
- If none pass, nearest non-fallback is chosen.
- Fallback (`isFallback: true`) is used only as a last resort.

## Scripts

- `npm run dev` start local dev server
- `npm run build` type-check + production build
- `npm run lint` run ESLint
- `npm run export -- --id <class_id>` export one class PNG to `out/`
- `npm run export:all` export all class PNGs to `out/`
- `npm run split:crests` split combined crest/equipment PNGs into separate assets
- `npm run tune:reachability` analyze class reachability
- `npm run tune:reachability:apply` apply reachability tuning to `data/questions.json`
- `npm run tune:balance` optimize reachability + class distribution balance
- `npm run tune:balance:apply` apply balanced tuning
- `npm run tune:balance:apply-best` write best candidate even if strict target is not met

Playwright setup (first time on a machine):

```bash
npx playwright install chromium
```

## Crest/Equipment Split Workflow

If you add new combined class art to `src/assets/crests_equipments/*.png`:

1. Run `npm run split:crests`
2. Script writes splits to:
   - `src/assets/crests/<name>.png`
   - `src/assets/equipments/<name>.png`
3. Reference those filenames in `data/results.json` (`partyRoleCrest`, `signatureEquipment`) or rely on filename fallback from `classSprite`.

## PNG Export Notes

`scripts/export.ts` spins up Vite, opens `/#/card/:id?export=1`, waits for fonts, validates `900x1400`, then captures PNG with transparent outer background.

## GitHub Pages

Configured for Pages deployment:

- `HashRouter` is used in `src/main.tsx`.
- Vite base path is computed in `vite.config.ts` (`/<repo>/` on GitHub Actions).
- Workflow file: `.github/workflows/deploy-pages.yml`.
