import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ResultCard } from '../components/ResultCard'
import { TextureOverlay } from '../components/TextureOverlay'
import { dimensionOrder, questionsData, resultsData } from '../lib/data'
import { createShowcaseScores } from '../lib/showcase'

const CARD_WIDTH = 900
const CARD_HEIGHT = 1400

function useSingleCardScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => {
      const widthScale = (window.innerWidth - 36) / CARD_WIDTH
      const heightScale = (window.innerHeight - 260) / CARD_HEIGHT
      setScale(Math.max(0.2, Math.min(1, widthScale, heightScale)))
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}

function ScaledCard({
  scale,
  children,
}: {
  scale: number
  children: ReactNode
}) {
  return (
    <div
      style={{
        width: CARD_WIDTH * scale,
        height: CARD_HEIGHT * scale,
      }}
    >
      <div
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function CardsPage() {
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single')
  const [selectedId, setSelectedId] = useState(resultsData.results[0]?.id ?? '')
  const singleScale = useSingleCardScale()

  const resultEntries = useMemo(() => {
    return resultsData.results.map((result) => ({
      result,
      scores: createShowcaseScores(result, dimensionOrder),
    }))
  }, [])

  const selected = resultEntries.find((entry) => entry.result.id === selectedId) ?? resultEntries[0]
  const gridScale = 220 / CARD_WIDTH

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_18%_12%,#2c2432_0%,#14131d_52%,#0a0a0f_100%)] p-4 pb-10 text-[#f5ead3] sm:p-7">
      <TextureOverlay opacity={0.21} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_24%,rgba(0,0,0,0.44)_100%)]" />

      <section className="relative mx-auto max-w-[1400px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-title text-xs tracking-[0.2em] uppercase text-[#d6ba83]">Class Card Library</p>
            <h1 className="font-title text-4xl text-[#f5ddb0] sm:text-5xl">Browse All Class Cards</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={[
                'rounded-md border px-4 py-2 font-title text-xs tracking-[0.14em] uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd892]',
                viewMode === 'single'
                  ? 'border-[#d3ad66] bg-[linear-gradient(140deg,#6c4a24_0%,#8f6831_100%)] text-[#ffefc9]'
                  : 'border-[#8d6a3f] text-[#efcf93] hover:border-[#e2bd71]',
              ].join(' ')}
            >
              Single
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={[
                'rounded-md border px-4 py-2 font-title text-xs tracking-[0.14em] uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd892]',
                viewMode === 'all'
                  ? 'border-[#d3ad66] bg-[linear-gradient(140deg,#6c4a24_0%,#8f6831_100%)] text-[#ffefc9]'
                  : 'border-[#8d6a3f] text-[#efcf93] hover:border-[#e2bd71]',
              ].join(' ')}
            >
              All
            </button>
          </div>
        </div>

        {viewMode === 'single' ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#5c452c] bg-[#17131d]/75 px-4 py-3">
              <label className="flex items-center gap-2 font-body text-sm text-[#d9c6a1]">
                <span>Class</span>
                <select
                  value={selected?.result.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="rounded border border-[#7b5f3d] bg-[#241b23] px-2 py-1 text-[#f2d9a8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe1a8]"
                >
                  {resultEntries.map((entry) => (
                    <option key={entry.result.id} value={entry.result.id}>
                      {entry.result.title}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <Link
                  to={`/card/${selected.result.id}`}
                  className="rounded-md border border-[#8d6a3f] px-4 py-2 font-title text-xs tracking-[0.15em] uppercase text-[#efcf93] transition hover:border-[#e2bd71] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd892]"
                >
                  Open Standalone
                </Link>
              )}
            </div>

            {selected && (
              <div className="rounded-xl border border-[#5d4930]/70 bg-[#100e14]/45 p-3 shadow-2xl">
                <div className="flex justify-center overflow-hidden">
                  <ScaledCard scale={singleScale}>
                    <ResultCard result={selected.result} scores={selected.scores} dimensions={questionsData.dimensions} />
                  </ScaledCard>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {resultEntries.map((entry) => (
              <article key={entry.result.id} className="rounded-lg border border-[#5f472e]/70 bg-[#15111a]/80 p-2">
                <Link to={`/card/${entry.result.id}`} className="block transition hover:brightness-110">
                  <ScaledCard scale={gridScale}>
                    <ResultCard result={entry.result} scores={entry.scores} dimensions={questionsData.dimensions} />
                  </ScaledCard>
                </Link>
                <p className="mt-2 px-1 text-center font-title text-xs tracking-[0.12em] uppercase text-[#e7cb95]">{entry.result.title}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
