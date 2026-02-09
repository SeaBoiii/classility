import type { CardStat } from '../data/sampleResult'

interface StatBarsProps {
  stats: CardStat[]
}

const TRACK_WIDTH = 372
const TRACK_HEIGHT = 22
const CENTER_X = TRACK_WIDTH / 2
const TICKS = [-20, -10, 0, 10, 20]

const BAR_THEMES = [
  { pos: '#d85f1f', neg: '#2f6fb4' },
  { pos: '#9a42b7', neg: '#295a93' },
  { pos: '#2f80d1', neg: '#356a95' },
  { pos: '#2f9a56', neg: '#3e5f7d' },
  { pos: '#b88a26', neg: '#3c5670' },
  { pos: '#8d7d56', neg: '#56687e' },
  { pos: '#7b6950', neg: '#5f728a' },
  { pos: '#a59469', neg: '#6a7892' },
]

function clamp(value: number) {
  return Math.max(-20, Math.min(20, value))
}

function signed(value: number) {
  return value > 0 ? `+${value}` : `${value}`
}

export function StatBars({ stats }: StatBarsProps) {
  return (
    <section className="stats-panel">
      <div className="stats-panel__header">
        <h3>Your Stat Profile</h3>
        <p>-20 &nbsp; -10 &nbsp; 0 &nbsp; +10 &nbsp; +20</p>
      </div>

      <div className="stat-bars">
        {stats.map((stat, index) => {
          const theme = BAR_THEMES[index % BAR_THEMES.length]
          const value = clamp(stat.value)
          const magnitude = (Math.abs(value) / 20) * CENTER_X
          const barX = value >= 0 ? CENTER_X : CENTER_X - magnitude
          const gradientId = `stat-bar-${stat.key}`

          return (
            <div className="stat-row" key={stat.key}>
              <span className="stat-row__label">{stat.label}</span>
              <svg
                aria-hidden="true"
                className="stat-row__svg"
                shapeRendering="crispEdges"
                viewBox={`0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
                    <stop offset="0%" stopColor={value >= 0 ? '#9c3f18' : '#2e5b89'} />
                    <stop offset="100%" stopColor={value >= 0 ? theme.pos : theme.neg} />
                  </linearGradient>
                </defs>

                <rect x={0} y={4} width={TRACK_WIDTH} height={14} rx={4} fill="#3f2f24" opacity="0.8" />

                {TICKS.map((tick) => {
                  const x = CENTER_X + (tick / 20) * CENTER_X
                  return (
                    <line
                      key={`${stat.key}-${tick}`}
                      x1={x}
                      y1={3}
                      x2={x}
                      y2={19}
                      stroke={tick === 0 ? '#f5deac' : '#ccb587'}
                      strokeOpacity={tick === 0 ? 0.95 : 0.55}
                      strokeWidth={tick === 0 ? 2 : 1}
                    />
                  )
                })}

                <rect x={barX} y={5} width={Math.max(2, magnitude)} height={12} rx={3} fill={`url(#${gradientId})`} />
              </svg>
              <span className="stat-row__value">{signed(value)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
