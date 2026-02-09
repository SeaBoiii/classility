interface StatBarProps {
  label: string
  value: number
  tone: {
    positive: string
    negative: string
  }
}

const TRACK_WIDTH = 350
const TRACK_HEIGHT = 24
const HALF = TRACK_WIDTH / 2

export function StatBar({ label, value, tone }: StatBarProps) {
  const clamped = Math.max(-20, Math.min(20, value))
  const magnitude = (Math.abs(clamped) / 20) * HALF
  const barX = clamped >= 0 ? HALF : HALF - magnitude
  const barColor = clamped >= 0 ? tone.positive : tone.negative
  const valueText = clamped > 0 ? `+${clamped}` : `${clamped}`
  const barWidth = magnitude === 0 ? 0 : Math.max(2, magnitude)

  return (
    <div className="rc-stat-row">
      <span className="rc-stat-row__label">{label}</span>
      <svg
        aria-hidden="true"
        shapeRendering="crispEdges"
        viewBox={`0 0 ${TRACK_WIDTH} ${TRACK_HEIGHT}`}
        className="rc-stat-row__svg"
      >
        <rect x={0} y={5} width={TRACK_WIDTH} height={14} rx={4} fill="rgba(58, 39, 25, 0.84)" />
        <line x1={HALF} y1={5} x2={HALF} y2={19} stroke="rgba(248, 231, 193, 0.7)" strokeWidth={1.6} />
        {barWidth > 0 && <rect x={barX} y={6} width={barWidth} height={12} rx={3} fill={barColor} />}

        {barWidth > 0 && <rect x={barX} y={6} width={barWidth} height={4} rx={2} fill="rgba(255, 248, 230, 0.35)" />}
      </svg>
      <span className="rc-stat-row__value">{valueText}</span>
    </div>
  )
}
