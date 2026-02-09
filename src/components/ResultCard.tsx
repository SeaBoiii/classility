import clsx from 'clsx'
import { dimensionLabelMap } from '../lib/data'
import { dominantPair } from '../lib/scoring'
import type { DimensionDefinition, ResultDefinition, Scores } from '../types'
import { StatBar } from './StatBar'
import '../styles/result-card.css'

interface ResultCardProps {
  result: ResultDefinition
  scores: Scores
  dimensions: DimensionDefinition[]
  className?: string
  exportMode?: boolean
}

export function ResultCard({ result, scores, dimensions, className, exportMode = false }: ResultCardProps) {
  const dimensionIds = dimensions.map((dim) => dim.id)
  const [firstDim, secondDim] = dominantPair(scores, dimensionIds)
  const signatureItem = result.signatureItem ?? defaultSignatureItem(result.id, result.title)
  const battleHabit = result.battleHabit ?? defaultBattleHabit(result.id)

  return (
    <div
      className={clsx('rc-shell', className)}
      data-card-export="true"
      style={{
        width: 900,
        height: 1400,
      }}
    >
      <article className={clsx('rc-card', exportMode && 'rc-card--export')}>
        <div className="rc-card__foil" />
        <svg className="rc-card__frame-lines" aria-hidden="true" viewBox="0 0 900 1400" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rcFrame" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dfbf7f" stopOpacity="0.98" />
              <stop offset="50%" stopColor="#7f5931" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#f1d7a1" stopOpacity="0.98" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="880" height="1380" rx="34" fill="none" stroke="url(#rcFrame)" strokeWidth="2.5" />
          <rect x="22" y="22" width="856" height="1356" rx="28" fill="none" stroke="#543b23" strokeWidth="1.6" strokeOpacity="0.88" />
          <rect x="36" y="36" width="828" height="1328" rx="22" fill="none" stroke="#d9bb84" strokeWidth="1.3" strokeOpacity="0.7" />
        </svg>

        <div className="rc-corner tl" />
        <div className="rc-corner tr" />
        <div className="rc-corner bl" />
        <div className="rc-corner br" />

        <section className="rc-parchment">
          <header className="rc-header">
            {result.classSprite ? (
              <SpriteSlice
                src={result.classSprite}
                top={110}
                bottom={430}
                alt={`${result.title} class title`}
                className="rc-title-art"
              />
            ) : (
              <div className="rc-title-banner">
                <h1>{result.title}</h1>
              </div>
            )}
            <p>{result.tagline}</p>
          </header>

          <Flourish />

          <section className="rc-body">
            <div className="rc-left">
              {result.classSprite && (
                <SpriteSlice
                  src={result.classSprite}
                  top={450}
                  bottom={1250}
                  alt={`${result.title} class duo`}
                  className="rc-duo-art"
                />
              )}
              <p className="rc-copy rc-summary-copy">{result.summary}</p>

              <Flourish compact />

              <p className="rc-copy rc-lore-copy">{result.lore}</p>
            </div>

            <aside className="rc-right">
              <h3 className="rc-traits-title">Traits</h3>
              <ul className="rc-traits">
                {result.traits.map((trait) => (
                  <li key={trait}>{trait}</li>
                ))}
              </ul>

              <Flourish compact />

              <section className="rc-stat-panel">
                <div className="rc-stat-panel__header">
                  <h3>Your Stat Profile</h3>
                </div>
                <div className="rc-stat-list">
                  {dimensions.map((dimension, index) => (
                    <StatBar
                      key={dimension.id}
                      label={dimension.label}
                      value={scores[dimension.id] ?? 0}
                      tone={resolveStatTone(dimension.id, index)}
                    />
                  ))}
                </div>
              </section>

              <div className="rc-meta-lines">
                <MetaLine label="Dominant Pair" value={`${dimensionLabelMap[firstDim]} + ${dimensionLabelMap[secondDim]}`} />
                <MetaLine label="Style" value={result.style} />
                <MetaLine label="Risk" value={result.risk} />
              </div>
            </aside>
          </section>

          <Flourish />

          <footer className="rc-footer">
            <MetaPanel label="Party Role" value={result.partyRole} />
            <MetaPanel label="Growth Quest" value={result.growthQuest} />
            <MetaPanel
              label="Bonus Flavor"
              value={[
                `Signature Item: ${signatureItem}`,
                `Battle Habit: ${battleHabit}`,
              ]}
            />
          </footer>
        </section>
      </article>
    </div>
  )
}

interface MetaLineProps {
  label: string
  value: string
}

function MetaLine({ label, value }: MetaLineProps) {
  return (
    <p className="rc-meta-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  )
}

interface MetaPanelProps {
  label: string
  value: string | string[]
}

function MetaPanel({ label, value }: MetaPanelProps) {
  return (
    <section className="rc-meta-panel">
      <h3>{label}</h3>
      {Array.isArray(value) ? (
        <div className="rc-meta-panel__list">
          {value.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : (
        <p>{value}</p>
      )}
    </section>
  )
}

function Flourish({ compact = false }: { compact?: boolean }) {
  return (
    <div className={clsx('rc-flourish', compact && 'compact')} aria-hidden="true">
      <svg viewBox="0 0 240 22" preserveAspectRatio="none">
        <path d="M5 11h76m78 0h76" stroke="currentColor" strokeOpacity="0.7" strokeWidth="1.3" />
        <path
          d="M120 4l4 4-4 4-4-4 4-4Zm0 6l6 6-6 6-6-6 6-6Z"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.8"
          strokeWidth="1.2"
        />
      </svg>
    </div>
  )
}

function defaultSignatureItem(id: string, title: string): string {
  const overrides: Record<string, string> = {
    class_spellblade: 'Runic Longsword of the Split Current',
    class_archmage: 'Ninefold Prism Grimoire',
    class_shadow: 'Veilthread Dirk',
    class_templar: 'Sunward Bastion Blade',
  }
  return overrides[id] ?? `${title} Crest Relic`
}

function defaultBattleHabit(id: string): string {
  const overrides: Record<string, string> = {
    class_spellblade: 'Break the line with a weave-step strike.',
    class_berserker: 'Open every clash by forcing tempo.',
    class_ranger: 'Take angles before revealing position.',
    class_oracle: 'Read the field before committing power.',
  }
  return overrides[id] ?? 'Find the opening, then commit without hesitation.'
}

interface SpriteSliceProps {
  src: string
  top: number
  bottom: number
  alt: string
  className?: string
}

const SPRITE_WIDTH = 1024
const SPRITE_HEIGHT = 1536

function SpriteSlice({ src, top, bottom, alt, className }: SpriteSliceProps) {
  const safeTop = Math.max(0, Math.min(SPRITE_HEIGHT - 1, top))
  const safeBottom = Math.max(safeTop + 1, Math.min(SPRITE_HEIGHT, bottom))
  const sliceHeight = safeBottom - safeTop
  const translateY = (safeTop / SPRITE_HEIGHT) * 100

  return (
    <div className={clsx('rc-sprite-slice', className)} style={{ aspectRatio: `${SPRITE_WIDTH} / ${sliceHeight}` }}>
      <img src={src} alt={alt} loading="lazy" style={{ transform: `translateY(-${translateY}%)` }} />
    </div>
  )
}

interface StatTone {
  positive: string
  negative: string
}

const STAT_TONE_BY_ID: Record<string, StatTone> = {
  power: { positive: '#c85c2f', negative: '#7f3b1f' },
  guard: { positive: '#b58e46', negative: '#6f5829' },
  swift: { positive: '#2f98c2', negative: '#1d5f78' },
  tactic: { positive: '#5f71cc', negative: '#374383' },
  arcana: { positive: '#944ad5', negative: '#562b7a' },
  faith: { positive: '#7aac4a', negative: '#49672d' },
  guile: { positive: '#3ea287', negative: '#235c4c' },
  command: { positive: '#be5b76', negative: '#723546' },
}

const FALLBACK_STAT_TONES: StatTone[] = [
  { positive: '#c85c2f', negative: '#7f3b1f' },
  { positive: '#b58e46', negative: '#6f5829' },
  { positive: '#2f98c2', negative: '#1d5f78' },
  { positive: '#5f71cc', negative: '#374383' },
]

function resolveStatTone(dimensionId: string, index: number): StatTone {
  return STAT_TONE_BY_ID[dimensionId] ?? FALLBACK_STAT_TONES[index % FALLBACK_STAT_TONES.length]
}
