interface StatBarProps {
  label: string
  value: number
}

const TRACK_WIDTH = 350
const TRACK_HEIGHT = 24
const HALF = TRACK_WIDTH / 2

const ticks = [-20, -10, 0, 10, 20]

export function StatBar({ label, value }: StatBarProps) {
  const clamped = Math.max(-20, Math.min(20, value))
  const magnitude = (Math.abs(clamped) / 20) * HALF
  const barX = clamped >= 0 ? HALF : HALF - magnitude
  const barColor = clamped >= 0 ? '#c67d2a' : '#37679a'
  const valueText = clamped > 0 ? `+${clamped}` : `${clamped}`

  return (
    <div className="rc-stat-row">
      <span className="rc-stat-row__label">{label}</span>
      <svg
        aria-hidden="true"
        shapeRendering="crispEdges"
        viewBox={`0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`}
        className="rc-stat-row__svg"
      >
        <rect x={0} y={5} width={TRACK_WIDTH} height={14} rx={4} fill="rgba(58, 39, 25, 0.86)" />

        {ticks.map((tick) => {
          const x = HALF + (tick / 20) * HALF
          return (
            <g key={tick}>
              <line
                x1={x}
                y1={4}
                x2={x}
                y2={20}
                stroke={tick === 0 ? 'rgba(250, 236, 198, 0.95)' : 'rgba(224, 200, 150, 0.6)'}
                strokeWidth={tick === 0 ? 2 : 1}
              />
            </g>
          )
        })}

        <rect
          x={barX}
          y={6}
          width={Math.max(2, magnitude)}
          height={12}
          rx={3}
          fill={barColor}
        />
      </svg>
      <span className="rc-stat-row__value">{valueText}</span>
    </div>
  )
}
