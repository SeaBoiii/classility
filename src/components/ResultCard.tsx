import type { SampleResult } from '../data/sampleResult'
import { StatBars } from './StatBars'

interface ResultCardProps {
  result: SampleResult
  exportMode?: boolean
}

export function ResultCard({ result, exportMode = false }: ResultCardProps) {
  return (
    <article className={`result-card ${exportMode ? 'export-mode' : ''}`} data-card-export="true">
      <div className="result-card__foil" />

      <svg aria-hidden="true" className="result-card__frame-lines" viewBox="0 0 900 1400" preserveAspectRatio="none">
        <defs>
          <linearGradient id="frameGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d8b572" stopOpacity="0.95" />
            <stop offset="48%" stopColor="#805c33" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#ecd39d" stopOpacity="0.94" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="880" height="1380" rx="34" fill="none" stroke="url(#frameGlow)" strokeWidth="2.5" />
        <rect x="22" y="22" width="856" height="1356" rx="28" fill="none" stroke="#4f3820" strokeOpacity="0.85" strokeWidth="1.6" />
        <rect x="37" y="37" width="826" height="1326" rx="20" fill="none" stroke="#d9bb84" strokeOpacity="0.7" strokeWidth="1.4" />
      </svg>

      <div className="result-card__corner tl" />
      <div className="result-card__corner tr" />
      <div className="result-card__corner bl" />
      <div className="result-card__corner br" />

      <section className="result-card__parchment">
        <header className="result-card__header">
          <div className="result-card__title-banner">
            <h1>{result.title}</h1>
          </div>
          <p>{result.tagline}</p>
        </header>

        <Flourish />

        <section className="result-card__body">
          <div className="result-card__left">
            <h2>Summary</h2>
            <p className="result-card__summary">{result.summary}</p>

            <Flourish compact />

            <h2>Lore</h2>
            <p className="result-card__lore">{result.lore}</p>

            <Flourish compact />

            <h2>Signals</h2>
            <ul className="result-card__signals">
              {result.signals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          </div>

          <aside className="result-card__right">
            <StatBars stats={result.stats} />

            <div className="result-card__meta-stack">
              <MetaLine label="Dominant Pair" value={result.dominantPair} />
              <MetaLine label="Style" value={result.style} />
              <MetaLine label="Risk" value={result.risk} />
            </div>
          </aside>
        </section>

        <Flourish />

        <footer className="result-card__footer">
          <MetaPanel title="Party Role" content={result.partyRole} />
          <MetaPanel title="Growth Quest" content={result.growthQuest} />
          <MetaPanel
            title="Bonus Flavor"
            content={[
              `Signature Item: ${result.signatureItem}`,
              `Battle Habit: ${result.battleHabit}`,
            ]}
          />
        </footer>
      </section>
    </article>
  )
}

interface MetaLineProps {
  label: string
  value: string
}

function MetaLine({ label, value }: MetaLineProps) {
  return (
    <p className="result-card__meta-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  )
}

interface MetaPanelProps {
  title: string
  content: string | string[]
}

function MetaPanel({ title, content }: MetaPanelProps) {
  return (
    <section className="result-card__meta-panel">
      <h3>{title}</h3>
      {Array.isArray(content) ? (
        <div className="result-card__meta-list">
          {content.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : (
        <p>{content}</p>
      )}
    </section>
  )
}

function Flourish({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`result-card__flourish ${compact ? 'compact' : ''}`} aria-hidden="true">
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
