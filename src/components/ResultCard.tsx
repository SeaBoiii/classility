import clsx from 'clsx'
import { dimensionLabelMap } from '../lib/data'
import { dominantPair } from '../lib/scoring'
import { resolveStatTone } from '../lib/statTones'
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
              {result.lore2 ? <p className="rc-copy rc-lore-copy rc-lore-copy--secondary">{result.lore2}</p> : null}
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
            <MetaPanel label="Party Role" value={result.partyRole} icon="blades" valueAlign="center" />
            <MetaPanel label="Growth Quest" value={result.growthQuest} icon="wand" />
            <MetaPanel
              label="Bonus Flavor"
              value={[
                { label: 'Signature Item', text: signatureItem },
                { label: 'Battle Habit', text: battleHabit },
              ]}
              icon="bow"
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
  value: string | Array<string | MetaPanelLine>
  icon: PanelTitleIconKind
  valueAlign?: 'left' | 'center'
}

function MetaPanel({ label, value, icon, valueAlign = 'left' }: MetaPanelProps) {
  return (
    <section className="rc-meta-panel">
      <div className="rc-meta-panel__heading">
        <PanelTitleIcon icon={icon} />
        <h3>{label}</h3>
        <PanelTitleIcon icon={icon} mirrored />
      </div>
      {Array.isArray(value) ? (
        <div className="rc-meta-panel__list">
          {value.map((line) => {
            if (typeof line === 'string') {
              return <p key={line}>{line}</p>
            }

            return (
              <p key={`${line.label}:${line.text}`}>
                <strong className="rc-meta-panel__sub-title">{line.label}:</strong> {line.text}
              </p>
            )
          })}
        </div>
      ) : (
        <p className={clsx(valueAlign === 'center' && 'rc-meta-panel__value--center')}>{value}</p>
      )}
    </section>
  )
}

interface MetaPanelLine {
  label: string
  text: string
}

type PanelTitleIconKind = 'blades' | 'wand' | 'bow'

function PanelTitleIcon({ icon, mirrored = false }: { icon: PanelTitleIconKind; mirrored?: boolean }) {
  return (
    <span className={clsx('rc-meta-panel__icon', mirrored && 'is-mirrored')} aria-hidden="true">
      {icon === 'blades' && (
        <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
          <path
            d="M5 4.5 11 10.5m8-6-6 6M4.5 19.5l7-7m8 7-7-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.45"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M2.8 3.1 5.4 5.7M18.6 5.4l2.6-2.6M2.8 20.9l2.6-2.6m12.9 2.6 2.6-2.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.45"
            strokeLinecap="round"
          />
        </svg>
      )}
      {icon === 'wand' && (
        <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
          <path
            d="m4.8 19.2 8.3-8.3m-7.1 9.4 2.1 1.1 1.2-2.1m5.8-12.1 1.1-2.2 1.1 2.2 2.2 1.1-2.2 1.1-1.1 2.2-1.1-2.2-2.2-1.1 2.2-1.1ZM19 13.8l.8-1.5.8 1.5 1.5.8-1.5.8-.8 1.5-.8-1.5-1.5-.8 1.5-.8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.45"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {icon === 'bow' && (
        <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
          <path
            d="M7 4.2c4 2.8 4 12.8 0 15.6m10-15.6c-4 2.8-4 12.8 0 15.6M7 12h10m-4.7-3.8 3.4 3.8-3.4 3.8"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.45"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
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

