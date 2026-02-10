import clsx from 'clsx'
import type { CSSProperties } from 'react'
import growthQuestArt from '../assets/growth_quest.png'
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
  const growthQuestDifficulty = clampGrowthQuestDifficulty(result.growthQuestDifficulty)
  const titleMotion = getTitleMotionProfile(result.id)

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
          <header
            className={clsx('rc-header', !exportMode && 'rc-header--animated', !exportMode && `rc-header--title-v${titleMotion.variant}`)}
            style={!exportMode ? titleMotion.style : undefined}
          >
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
            <MetaPanel
              label="Party Role"
              value={result.partyRole}
              icon="blades"
              valueAlign="center"
              artSrc={result.partyRoleCrest}
              artAlt={`${result.title} party crest`}
              artClassName="rc-meta-panel__art--party-role"
              panelClassName="rc-meta-panel--party-role"
            />
            <GrowthQuestPanel
              label="Growth Quest"
              value={result.growthQuest}
              difficulty={growthQuestDifficulty}
              icon="wand"
              artSrc={growthQuestArt}
              artAlt="Growth quest illustration"
            />
            <BonusFlavorPanel
              label="Bonus Flavor"
              signatureItem={signatureItem}
              battleHabit={battleHabit}
              equipmentSrc={result.signatureEquipment}
              equipmentAlt={`${result.title} signature equipment`}
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
  value: string | string[]
  icon: PanelTitleIconKind
  valueAlign?: 'left' | 'center'
  artSrc?: string
  artAlt?: string
  artClassName?: string
  panelClassName?: string
}

function MetaPanel({
  label,
  value,
  icon,
  valueAlign = 'left',
  artSrc,
  artAlt = '',
  artClassName,
  panelClassName,
}: MetaPanelProps) {
  return (
    <section className={clsx('rc-meta-panel', artSrc && 'rc-meta-panel--with-art', panelClassName)}>
      <div className="rc-meta-panel__heading">
        <PanelTitleIcon icon={icon} />
        <h3>{label}</h3>
        <PanelTitleIcon icon={icon} mirrored />
      </div>
      <div className="rc-meta-panel__body">
        {Array.isArray(value) ? (
          <div className="rc-meta-panel__content rc-meta-panel__list">
            {value.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : (
          <p className={clsx('rc-meta-panel__content', valueAlign === 'center' && 'rc-meta-panel__value--center')}>{value}</p>
        )}
        {artSrc ? (
          <div className={clsx('rc-meta-panel__art', artClassName)}>
            <img src={artSrc} alt={artAlt} loading="lazy" />
          </div>
        ) : null}
      </div>
    </section>
  )
}

interface BonusFlavorPanelProps {
  label: string
  signatureItem: string
  battleHabit: string
  equipmentSrc?: string
  equipmentAlt?: string
  icon: PanelTitleIconKind
}

function BonusFlavorPanel({
  label,
  signatureItem,
  battleHabit,
  equipmentSrc,
  equipmentAlt = '',
  icon,
}: BonusFlavorPanelProps) {
  return (
    <section className={clsx('rc-meta-panel', equipmentSrc && 'rc-meta-panel--with-art')}>
      <div className="rc-meta-panel__heading">
        <PanelTitleIcon icon={icon} />
        <h3>{label}</h3>
        <PanelTitleIcon icon={icon} mirrored />
      </div>
      <div className="rc-meta-panel__body rc-meta-panel__body--bonus">
        <p>
          <strong className="rc-meta-panel__sub-title">Signature Item:</strong> {signatureItem}
        </p>
        {equipmentSrc ? (
          <div className="rc-meta-panel__equipment-frame">
            <EquipmentOrnament />
            <div className="rc-meta-panel__art rc-meta-panel__art--equipment">
              <img src={equipmentSrc} alt={equipmentAlt} loading="lazy" />
            </div>
            <EquipmentOrnament mirrored />
          </div>
        ) : null}
        <p>
          <strong className="rc-meta-panel__sub-title">Battle Habit:</strong> {battleHabit}
        </p>
      </div>
    </section>
  )
}

type PanelTitleIconKind = 'blades' | 'wand' | 'bow'

interface GrowthQuestPanelProps {
  label: string
  value: string
  difficulty: number
  icon: PanelTitleIconKind
  artSrc: string
  artAlt: string
}

function GrowthQuestPanel({ label, value, difficulty, icon, artSrc, artAlt }: GrowthQuestPanelProps) {
  const normalizedDifficulty = clampGrowthQuestDifficulty(difficulty)

  return (
    <section className="rc-meta-panel rc-meta-panel--with-art rc-meta-panel--growth">
      <div className="rc-meta-panel__heading">
        <PanelTitleIcon icon={icon} />
        <h3>{label}</h3>
        <PanelTitleIcon icon={icon} mirrored />
      </div>
      <div className="rc-meta-panel__body">
        <p className="rc-meta-panel__content">{value}</p>

        <div
          className="rc-growth-difficulty"
          data-difficulty={normalizedDifficulty}
          aria-label={`Growth quest difficulty ${normalizedDifficulty} of 5`}
        >
          <span className="rc-growth-difficulty__label">Quest Difficulty</span>
          <div className="rc-growth-difficulty__glyphs">
            {Array.from({ length: 5 }, (_, index) => (
              <span key={index} className={clsx('rc-growth-glyph', index < normalizedDifficulty && 'is-active')} aria-hidden="true">
                <GrowthGlyphIcon />
              </span>
            ))}
          </div>
        </div>

        <div className="rc-meta-panel__art rc-meta-panel__art--growth-quest">
          <img src={artSrc} alt={artAlt} loading="lazy" />
        </div>
      </div>
    </section>
  )
}

function GrowthGlyphIcon() {
  return (
    <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet">
      <path
        d="M12 2.8v18.4M7 6.8h10M6.2 11.8h11.6M7 16.8h10M12 4.2l1.6 1.6-1.6 1.6-1.6-1.6L12 4.2Zm0 12.4 1.6 1.6-1.6 1.6-1.6-1.6 1.6-1.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EquipmentOrnament({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <span className={clsx('rc-meta-panel__equipment-ornament', mirrored && 'is-mirrored')} aria-hidden="true">
      <svg viewBox="0 0 24 40" preserveAspectRatio="xMidYMid meet">
        <path
          d="M5 3h5l4 4v26l-4 4H5m11-28h3m-3 7h3m-3 7h3m-3 7h3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 12h3m-3 8h3" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
      </svg>
    </span>
  )
}

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

type TitleMotionVariant = 1 | 2 | 3 | 4 | 5

interface TitleMotionProfile {
  variant: TitleMotionVariant
  style: CSSProperties
}

function getTitleMotionProfile(id: string): TitleMotionProfile {
  const hash = hashString(id)
  const variant = ((hash % 5) + 1) as TitleMotionVariant

  const n0 = ((hash >>> 0) & 0xff) / 255
  const n1 = ((hash >>> 8) & 0xff) / 255
  const n2 = ((hash >>> 16) & 0xff) / 255
  const n3 = ((hash >>> 24) & 0xff) / 255

  const floatDuration = `${(6.4 + n0 * 2.6).toFixed(2)}s`
  const pulseDuration = `${(8.8 + n1 * 3.4).toFixed(2)}s`
  const sheenDuration = `${(11.2 + n2 * 4.1).toFixed(2)}s`
  const phaseDelay = `${(-n3 * 3.8).toFixed(2)}s`
  const floatX = `${(0.6 + n1 * 1.5).toFixed(2)}px`
  const floatY = `${(2.3 + n0 * 2.4).toFixed(2)}px`
  const tilt = `${(0.24 + n2 * 0.64).toFixed(3)}deg`
  const scale = (1.006 + n3 * 0.014).toFixed(3)
  const glowStrength = (0.18 + n0 * 0.18).toFixed(2)
  const hueShift = `${Math.round(-13 + n2 * 26)}deg`

  return {
    variant,
    style: {
      '--rc-title-float-duration': floatDuration,
      '--rc-title-pulse-duration': pulseDuration,
      '--rc-title-sheen-duration': sheenDuration,
      '--rc-title-phase-delay': phaseDelay,
      '--rc-title-float-x': floatX,
      '--rc-title-float-y': floatY,
      '--rc-title-tilt': tilt,
      '--rc-title-scale': scale,
      '--rc-title-glow-strength': glowStrength,
      '--rc-title-hue-shift': hueShift,
    } as CSSProperties,
  }
}

function hashString(value: string): number {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

function clampGrowthQuestDifficulty(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 3
  }

  return Math.min(5, Math.max(1, Math.round(value)))
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

