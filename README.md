<div align="center">

# ⚔️ Classility

### Discover Your RPG Class Through Personality

*A fantasy-themed personality quiz that maps your choices to RPG class archetypes and generates beautiful, shareable result cards.*

[🎮 Try the Quiz](https://seaboiii.github.io/classility/) | [📖 Documentation](#documentation) | [🤝 Contributing](#contributing)

---

</div>

## ✨ Overview

**Classility** is an interactive web application that combines fantasy RPG aesthetics with personality assessment. Answer 20 thought-provoking questions and discover which fantasy class—from Paladin to Spellblade, Druid to Warlord—best matches your personality profile.

Each result includes:
- 🎭 **Detailed Character Profile** - Lore, traits, and personality insights
- 📊 **Stat Breakdown** - Visualized dimensional scoring across Power, Faith, Arcana, Nature, Guard, and Tactics
- 🎨 **Custom Card** - High-quality result cards with class art and equipment (exportable as PNG)
- 🎯 **Party Role** - Your strategic function in a team setting
- 🌟 **Growth Quest** - Personalized character development challenge

### 🎯 Key Features

- **Immersive UI** - Landing page with animated door-opening transition
- **Smart Evaluation** - Deterministic scoring using weighted dimensions and conditional rules
- **20 Unique Classes** - Each with distinct lore, traits, and visual identity
- **Scene Artwork** - Optional atmospheric images for quiz questions
- **Smooth Transitions** - Elegant fade animations between questions
- **PNG Export** - Generate shareable `900×1400px` result cards
- **Route Protection** - Prevents result viewing without completing the quiz
- **Responsive Design** - Works seamlessly across desktop and mobile devices

## 🚀 Tech Stack

- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom theme
- **Routing**: React Router (HashRouter for GitHub Pages)
- **Fonts**: Cinzel & EB Garamond via Fontsource
- **Export**: Playwright + html-to-image
- **Deployment**: GitHub Pages with automated CI/CD

## 🎮 Quick Start

### Prerequisites

- **Node.js** 20 or higher
- **npm** (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/SeaBoiii/classility.git
cd classility

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser. The app will automatically reload when you make changes.

### Building for Production

```bash
# Type-check and build
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint
```

The production build will be output to the `dist/` directory.

## 🗺️ Application Routes

| Route | Description |
|-------|-------------|
| `/#/` | Landing page with animated door entrance |
| `/#/quiz` | 20-question personality assessment |
| `/#/result` | Your latest result (redirects if no attempt) |
| `/#/result?seed=demo` | Deterministic demo result for debugging |
| `/#/cards` | Browse all available class cards |
| `/#/card/:id` | Standalone card renderer (used for exports) |
| `/#/dimensions` | View scoring dimensions and axes |

> **Note**: The app uses HashRouter for GitHub Pages compatibility.

## 📚 Documentation

### Data Model

The application uses three JSON files in the `data/` directory to define quiz behavior:

#### `dimensions.json` - Scoring Axes

Defines the personality dimensions that questions measure:

```json
{
  "id": "power",
  "label": "Power",
  "left": "Finesse",
  "right": "Force",
  "description": "How you approach challenges"
}
```

**Fields:**
- `id` - Unique dimension identifier
- `label` - Display name
- `left` / `right` - Opposing poles of the spectrum
- `description` *(optional)* - Explanation of what this dimension measures

#### `questions.json` - Quiz Content

Defines the 20 questions presented during the quiz:

```json
{
  "id": 1,
  "prompt": "When facing an obstacle...",
  "image": "mountain_path.png",
  "options": [
    {
      "text": "Find a way around it",
      "weights": { "tactics": 2, "nature": 1 }
    }
  ]
}
```

**Fields:**
- `id` - Question number (1-20)
- `prompt` - Question text displayed to user
- `image` *(optional)* - Filename from `src/assets/scenes/`
- `options` - Array of exactly 4 answer choices
  - `text` - Answer text
  - `weights` - Object mapping dimension IDs to point values

#### `results.json` - Class Definitions

Defines all possible class results and their matching conditions:

```json
{
  "id": "class_paladin",
  "title": "Paladin",
  "tagline": "A Vow Given Form",
  "summary": "You stand as a vow made visible...",
  "lore": "Paladins are not simply defenders...",
  "priority": 20,
  "conditions": [
    { "type": "rank_is", "dim": "guard", "rank": 1 }
  ],
  "classSprite": "paladin.png",
  "partyRole": "Defensive Striker",
  "growthQuestDifficulty": 4
}
```

**Core Identity Fields:**
- `id`, `title`, `tagline`, `summary`
- `lore`, `lore2` *(optional extended lore)*
- `traits` - Array of personality traits

**Visual Assets:**
- `classSprite` - Filename from `src/assets/class_sprites/`
- `partyRoleCrest` - Filename from `src/assets/crests/`
- `signatureEquipment` - Filename from `src/assets/equipments/`

**Metadata:**
- `style`, `risk`, `partyRole`
- `growthQuest`, `growthQuestDifficulty` (1-5 scale)
- `signatureItem`, `battleHabit`

**Matching Logic:**
- `priority` - Higher values are preferred when multiple classes match
- `conditions` - Array of rules that must ALL pass for this class to match
- `isFallback` *(optional)* - Last resort if no other classes match

### Asset Resolution

Assets are automatically resolved by the data loader (`src/lib/data.ts`):

| Asset Type | Source Directory | Fallback |
|------------|-----------------|----------|
| Scene images | `src/assets/scenes/` | None |
| Class sprites | `src/assets/class_sprites/` | None |
| Party crests | `src/assets/crests/` | Uses `classSprite` name |
| Equipment art | `src/assets/equipments/` | Uses `classSprite` name |

### Evaluation & Scoring System

The class evaluation system uses a two-stage process:

#### Stage 1: Score Calculation

Each quiz answer adds points to specific dimensions based on the `weights` defined in the question options. The total score for each dimension determines your personality profile.

**Implementation**: `src/lib/scoring.ts`

#### Stage 2: Class Matching

Classes are matched using rule-based conditions. All conditions for a class must pass for it to be considered.

**Implementation**: `src/lib/evaluator.ts`

#### Supported Condition Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `min` | Dimension must meet minimum value | `{ "type": "min", "dim": "power", "value": 15 }` |
| `max_le` | Dimension must be ≤ value | `{ "type": "max_le", "dim": "faith", "value": 10 }` |
| `max_ge` | Dimension must be ≥ value | `{ "type": "max_ge", "dim": "arcana", "value": 18 }` |
| `diff_greater` | Difference between two dims > value | `{ "type": "diff_greater", "dim1": "power", "dim2": "tactics", "value": 5 }` |
| `diff_abs_lte` | Absolute difference ≤ value | `{ "type": "diff_abs_lte", "dim1": "guard", "dim2": "faith", "value": 3 }` |
| `top_is` | Highest scoring dimension must be specified dim | `{ "type": "top_is", "dim": "nature" }` |
| `not_top_is` | Highest scoring dimension must NOT be specified dim | `{ "type": "not_top_is", "dim": "power" }` |
| `rank_is` | Dimension must rank at specified position | `{ "type": "rank_is", "dim": "tactics", "rank": 1 }` |
| `top_diff_gte` | Difference between top 2 dims ≥ value | `{ "type": "top_diff_gte", "value": 8 }` |
| `top_diff_lte` | Difference between top 2 dims ≤ value | `{ "type": "top_diff_lte", "value": 6 }` |
| `total_min` | Sum of all dimensions ≥ value | `{ "type": "total_min", "value": 60 }` |
| `total_max` | Sum of all dimensions ≤ value | `{ "type": "total_max", "value": 80 }` |
| `sum_min` | Sum of specified dims ≥ value | `{ "type": "sum_min", "dims": ["power", "guard"], "value": 20 }` |
| `sum_max` | Sum of specified dims ≤ value | `{ "type": "sum_max", "dims": ["arcana", "faith"], "value": 30 }` |
| `spread_between` | Range of scores falls within bounds | `{ "type": "spread_between", "min": 0, "max": 14 }` |

#### Selection Algorithm

1. **Evaluate all classes** - Check which classes have all conditions satisfied
2. **Sort passing classes** - By `priority` (descending), then by file order
3. **Select best match** - First class in sorted list
4. **Fallback logic**:
   - If no classes pass, choose the "nearest" non-fallback class (best partial match)
   - If no matches at all, use the class marked with `isFallback: true`

## 🛠️ Available Scripts

### Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server with hot reload |
| `npm run build` | Type-check with TypeScript and build for production |
| `npm run lint` | Run ESLint to check code quality |
| `npm run preview` | Preview production build locally |

### Card Export

Generate high-quality PNG exports of class result cards:

| Command | Description |
|---------|-------------|
| `npm run export -- --id <class_id>` | Export single class card to `out/` directory |
| `npm run export:all` | Export all class cards as PNGs |

**First-time setup** (requires Chromium for Playwright):
```bash
npx playwright install chromium
```

**Export details:**
- Output size: `900×1400px`
- Transparent outer background
- Fonts loaded and validated before capture
- Uses headless Chromium via Playwright

### Asset Management

| Command | Description |
|---------|-------------|
| `npm run split:crests` | Split combined crest/equipment PNGs into separate assets |

**Workflow for adding new class art:**
1. Place combined art in `src/assets/crests_equipments/<name>.png`
2. Run `npm run split:crests`
3. Script automatically creates:
   - `src/assets/crests/<name>.png` (top half)
   - `src/assets/equipments/<name>.png` (bottom half)
4. Reference in `data/results.json` or rely on filename fallback

### Balance & Tuning

Advanced scripts for optimizing quiz balance and class reachability:

| Command | Description |
|---------|-------------|
| `npm run tune:reachability` | Analyze if all classes are reachable (dry run) |
| `npm run tune:reachability:apply` | Tune question weights to ensure all classes are reachable |
| `npm run tune:balance` | Optimize for balanced class distribution (dry run) |
| `npm run tune:balance:apply` | Apply balanced weight optimization to questions |
| `npm run tune:balance:apply-best` | Write best candidate even if strict targets aren't met |

**Tuning parameters:**
- `--target-reachability 1` - Ensure 100% of classes are reachable
- `--optimize-probability` - Optimize for even distribution
- `--probability-samples 40000` - Number of random quiz attempts to simulate
- `--probability-tolerance 1` - Acceptable deviation from ideal distribution (%)
- `--timeout-ms 3600000` - Maximum optimization time (1 hour)
- `--workers 0` - Use all available CPU cores

> ⚠️ These commands modify `data/questions.json`. Always commit before running with `--write` flags.

## 🚢 Deployment

### GitHub Pages

The project is configured for automatic deployment to GitHub Pages:

- **Workflow**: `.github/workflows/deploy-pages.yml`
- **Trigger**: Automatic on push to `main` branch, or manual via workflow dispatch
- **Base Path**: Automatically configured in `vite.config.ts` for `/<repo>/` path
- **Router**: Uses `HashRouter` for GitHub Pages compatibility (no server-side routing needed)

**Deployment process:**
1. Push to `main` branch
2. GitHub Actions runs `npm ci` and `npm run build`
3. Outputs `dist/` directory to GitHub Pages
4. Site available at `https://seaboiii.github.io/classility/`

### Custom Deployment

For other hosting platforms:

```bash
# Build the project
npm run build

# Deploy the dist/ directory to your hosting service
# (Netlify, Vercel, AWS S3, etc.)
```

> **Note**: If deploying to a subdirectory, update the `base` property in `vite.config.ts`

## 📁 Project Structure

```
classility/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml    # GitHub Pages deployment workflow
├── data/
│   ├── dimensions.json         # Personality dimension definitions
│   ├── questions.json          # Quiz questions and weights
│   └── results.json            # Class definitions and conditions
├── scripts/
│   ├── export.ts               # Playwright-based PNG export
│   ├── tune-reachability.ts    # Balance optimization scripts
│   └── split-crests-equipments.ps1  # Asset splitting utility
├── src/
│   ├── assets/                 # Images, sprites, and artwork
│   │   ├── class_sprites/      # Main class character art
│   │   ├── crests/             # Party role crest icons
│   │   ├── equipments/         # Signature equipment art
│   │   ├── scenes/             # Question background images
│   │   └── crests_equipments/  # Combined assets (pre-split)
│   ├── components/             # Reusable UI components
│   ├── lib/
│   │   ├── data.ts            # Asset loading and resolution
│   │   ├── evaluator.ts       # Class matching logic
│   │   └── scoring.ts         # Score calculation
│   ├── pages/                 # Route page components
│   │   ├── LandingPage.tsx    # Animated entrance
│   │   ├── QuizPage.tsx       # Question flow
│   │   ├── ResultPage.tsx     # Result display
│   │   ├── CardsPage.tsx      # Class browser
│   │   ├── CardPage.tsx       # Single card view
│   │   └── DimensionsPage.tsx # Dimension reference
│   ├── styles/                # Global styles and Tailwind
│   ├── types.ts               # TypeScript type definitions
│   ├── App.tsx                # Root component with routing
│   └── main.tsx               # Application entry point
├── index.html                 # HTML template
├── package.json               # Dependencies and scripts
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

## 🐛 Troubleshooting

### Build Issues

**Problem**: TypeScript errors during build
```bash
# Clear cache and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Problem**: Vite port already in use
```bash
# Start on a different port
npm run dev -- --port 3000
```

### Export Issues

**Problem**: Playwright browser not installed
```bash
# Install Chromium browser
npx playwright install chromium
```

**Problem**: Export produces blank images
- Ensure fonts are loaded (script waits for this automatically)
- Check that the class ID exists in `data/results.json`
- Verify all asset paths are correct

### Quiz Logic Issues

**Problem**: Class never appears as result
- Run `npm run tune:reachability` to check if class is reachable
- Verify the conditions aren't contradictory
- Check if another class with higher priority is always matching first

**Problem**: Unbalanced class distribution
- Run `npm run tune:balance` to analyze current distribution
- Use `npm run tune:balance:apply` to optimize question weights

### Development Issues

**Problem**: Changes not reflecting in browser
- Check that hot reload is working (Vite should log updates)
- Hard refresh the browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)
- Clear browser cache and localStorage

**Problem**: Images not loading
- Verify asset files exist in correct directories
- Check filename spelling in JSON data files
- Ensure Vite is resolving assets correctly (check browser console)

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

### Adding New Classes

1. **Create artwork** - Add sprite, crest, and equipment images to appropriate `src/assets/` folders
2. **Define class** - Add entry to `data/results.json` with lore, traits, and conditions
3. **Test balance** - Run `npm run tune:reachability` to ensure class is reachable
4. **Export card** - Generate PNG with `npm run export -- --id your_class_id`

### Adding Questions

1. **Design question** - Create engaging scenario with 4 distinct options
2. **Add to data** - Insert into `data/questions.json` with appropriate dimension weights
3. **Test balance** - Run tuning scripts to ensure question doesn't break distribution
4. **Optional**: Add scene image to `src/assets/scenes/`

### Improving the UI

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly (`npm run dev`, `npm run build`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Style

- Follow existing TypeScript and React patterns
- Use Tailwind CSS for styling (avoid inline styles)
- Run `npm run lint` before committing
- Keep components focused and reusable
- Add comments for complex logic

## 📄 License

This project is available for personal and educational use. Please check with the repository owner before using commercially.

## 🙏 Acknowledgments

- Character art and design inspiration from classic RPG games
- Fonts: [Cinzel](https://fonts.google.com/specimen/Cinzel) and [EB Garamond](https://fonts.google.com/specimen/EB+Garamond)
- Built with modern web technologies from the React and Vite ecosystems

---

<div align="center">

**Made with ⚔️ by [SeaBoiii](https://github.com/SeaBoiii)**

[⬆ Back to Top](#-classility)

</div>
