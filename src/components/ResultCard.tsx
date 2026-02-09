import clsx from 'clsx'
import { dimensionLabelMap } from '../lib/data'
import { dominantPair, summarizeScores } from '../lib/scoring'
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
  const summary = summarizeScores(scores, dimensionIds)

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
            <div className="rc-title-banner">
              <h1>{result.title}</h1>
            </div>
            <p>{result.tagline}</p>
          </header>

          <Flourish />

          <section className="rc-body">
            <div className="rc-left">
              <h2>Summary</h2>
              <p className="rc-copy">{result.summary}</p>

              <Flourish compact />

              <h2>Lore</h2>
              <p className="rc-copy">{result.lore}</p>

              <Flourish compact />

              <h2>Signals</h2>
              <ul className="rc-signals">
                {result.signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>

            <aside className="rc-right">
              <section className="rc-stat-panel">
                <div className="rc-stat-panel__header">
                  <h3>Your Stat Profile</h3>
                  <p>-20&nbsp;&nbsp; -10&nbsp;&nbsp; 0&nbsp;&nbsp; +10&nbsp;&nbsp; +20</p>
                </div>
                <div className="rc-stat-list">
                  {dimensions.map((dimension) => (
                    <StatBar key={dimension.id} label={dimension.label} value={scores[dimension.id] ?? 0} />
                  ))}
                </div>
              </section>

              <div className="rc-meta-lines">
                <MetaLine label="Dominant Pair" value={`${dimensionLabelMap[firstDim]} + ${dimensionLabelMap[secondDim]}`} />
                <MetaLine label="Style" value={result.style} />
                <MetaLine label="Risk" value={result.risk} />
                <MetaLine label="Spread" value={`${summary.spread}`} />
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
