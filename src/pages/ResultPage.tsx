import { toPng } from 'html-to-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { DebugPanel } from '../components/DebugPanel'
import { ResultCard } from '../components/ResultCard'
import { TextureOverlay } from '../components/TextureOverlay'
import { dimensionOrder, questionsData, resultsData } from '../lib/data'
import { evaluateResults } from '../lib/evaluator'
import { seededChoices } from '../lib/seed'
import { scoreAnswers } from '../lib/scoring'
import { resolveStatTone } from '../lib/statTones'
import { loadAttempt } from '../lib/storage'

interface ResultLocationState {
  answers?: number[]
}

function waitForImageReady(image: HTMLImageElement): Promise<void> {
  if (image.complete) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      image.removeEventListener('load', onDone)
      image.removeEventListener('error', onDone)
      window.clearTimeout(timeoutId)
    }

    const onDone = () => {
      cleanup()
      resolve()
    }

    const timeoutId = window.setTimeout(onDone, 3500)
    image.addEventListener('load', onDone, { once: true })
    image.addEventListener('error', onDone, { once: true })
  })
}

async function waitForCardAssets(node: HTMLElement): Promise<void> {
  if ('fonts' in document) {
    await document.fonts.ready
  }

  const images = Array.from(node.querySelectorAll('img'))
  await Promise.all(images.map((image) => waitForImageReady(image)))

  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })
}

function useCardScale() {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => {
      const widthScale = (window.innerWidth - 28) / 900
      const heightScale = (window.innerHeight - 260) / 1400
      setScale(Math.max(0.2, Math.min(1, widthScale, heightScale)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}

export function ResultPage() {
  const isDev = import.meta.env.DEV
  const navigate = useNavigate()
  const location = useLocation()
  const scale = useCardScale()
  const [debugOpen, setDebugOpen] = useState(false)
  const [dimensionsOpen, setDimensionsOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const hiddenCaptureRef = useRef<HTMLDivElement>(null)
  const searchParams = new URLSearchParams(location.search)
  const seed = searchParams.get('seed')

  const answers = useMemo(() => {
    if (seed) {
      return seededChoices(seed, questionsData.questions.length, 4)
    }

    const state = location.state as ResultLocationState | null
    if (state?.answers?.length === questionsData.questions.length) {
      return state.answers
    }

    const stored = loadAttempt()
    if (stored?.answers?.length === questionsData.questions.length) {
      return stored.answers
    }

    return null
  }, [location.state, seed])

  const evaluation = useMemo(() => {
    if (!answers) {
      return null
    }
    const scores = scoreAnswers(dimensionOrder, questionsData.questions, answers)
    return evaluateResults(scores, dimensionOrder, resultsData.results)
  }, [answers])

  const handleDownload = async () => {
    const node = hiddenCaptureRef.current?.querySelector('[data-card-export="true"]') as HTMLElement | null
    if (!node || !evaluation) {
      return
    }

    setIsDownloading(true)
    try {
      await waitForCardAssets(node)
      const dataUrl = await toPng(node, {
        cacheBust: true,
        pixelRatio: 1,
        backgroundColor: 'transparent',
      })
      const link = document.createElement('a')
      link.download = `${evaluation.winner.id}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setIsDownloading(false)
    }
  }

  if (!answers || !evaluation) {
    return <Navigate replace to="/" />
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_18%_12%,#2c2432_0%,#14131d_52%,#0a0a0f_100%)] p-4 pb-10 text-[#f5ead3] sm:p-7">
      <TextureOverlay opacity={0.21} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_24%,rgba(0,0,0,0.44)_100%)]" />

      <section className="relative mx-auto max-w-[1260px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-title text-xs tracking-[0.2em] uppercase text-[#d6ba83]">Classility Result</p>
            <h1 className="font-title text-4xl text-[#f5ddb0] sm:text-5xl">{evaluation.winner.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isDev && (
              <button
                type="button"
                onClick={() => navigate('/cards')}
                className="rounded-md border border-[#8d6a3f] px-4 py-2 font-title text-xs tracking-[0.15em] uppercase text-[#efcf93] transition hover:border-[#e2bd71] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd892]"
              >
                View Cards
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/quiz')}
              className="rounded-md border border-[#8d6a3f] px-4 py-2 font-title text-xs tracking-[0.15em] uppercase text-[#efcf93] transition hover:border-[#e2bd71] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd892]"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="rounded-md border border-[#d3ad66] bg-[linear-gradient(140deg,#6c4a24_0%,#8f6831_100%)] px-4 py-2 font-title text-xs tracking-[0.15em] uppercase text-[#ffefc9] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffe0a7]"
            >
              {isDownloading ? 'Rendering...' : 'Download PNG'}
            </button>
          </div>
        </div>

        {isDev && (
          <div className="mb-4 rounded-lg border border-[#5c452c] bg-[#17131d]/75 px-4 py-3 font-body text-sm text-[#d9c6a1]">
            CLI export command:{' '}
            <code className="rounded bg-[#261d12] px-2 py-1 text-[#f2d59b]">npm run export -- --id {evaluation.winner.id}</code>
            {seed && (
              <span className="ml-2">
                seed: <code className="rounded bg-[#261d12] px-2 py-1 text-[#f2d59b]">{seed}</code>
              </span>
            )}
          </div>
        )}

        <div className="rounded-xl border border-[#5d4930]/70 bg-[#100e14]/45 p-3 shadow-2xl">
          <div className="flex justify-center overflow-hidden">
            <div
              style={{
                width: 900 * scale,
                height: 1400 * scale,
              }}
            >
              <div
                style={{
                  width: 900,
                  height: 1400,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                }}
              >
                <ResultCard result={evaluation.winner} scores={evaluation.summary.scores} dimensions={questionsData.dimensions} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="fixed bottom-5 left-5 z-50">
        <button
          type="button"
          onClick={() => setDimensionsOpen((value) => !value)}
          aria-expanded={dimensionsOpen}
          aria-controls="dimension-legend-dialog"
          className="group inline-flex items-center gap-2 rounded-full border border-[#8d6a3f]/85 bg-[#15121a]/90 px-4 py-2 text-left transition hover:border-[#e2bd71] hover:bg-[#1d1722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd892]"
        >
          <span className="font-title text-xs tracking-[0.16em] uppercase text-[#efd6a3]">Legend</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#9f7a48]/80 bg-[#231a12]/70 text-[#f0cf93]">
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className={['h-3 w-3 transition-transform duration-200', dimensionsOpen ? 'rotate-180' : 'rotate-0'].join(' ')}
            >
              <path d="M5 8.5 10 13l5-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      </section>

      {dimensionsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#08060b]/84 px-4 py-6">
          <section
            id="dimension-legend-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Dimensions information"
            className="max-h-full w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#6b5131] bg-[radial-gradient(circle_at_24%_14%,#2b2334_0%,#13131a_58%,#0a0a0f_100%)] p-4 text-[#f4ead4] shadow-[0_26px_80px_rgba(0,0,0,0.65)] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-title text-xs tracking-[0.28em] text-[#d9bc83] uppercase">For More Information</p>
                <h2 className="mt-2 font-title text-3xl text-[#f8dfab] sm:text-4xl">Legend: How Your Class Is Measured</h2>
              </div>
              <button
                type="button"
                onClick={() => setDimensionsOpen(false)}
                className="rounded-md border border-[#8d6a3f] px-3 py-2 font-title text-xs tracking-[0.15em] uppercase text-[#efcf93] transition hover:border-[#e2bd71] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd892]"
              >
                Close
              </button>
            </div>

            <p className="mt-3 max-w-3xl font-body text-base text-[#dbc6a2] sm:text-lg">
              Each answer shifts your profile across eight dimensions. Every axis runs from a low-expression trait to a
              high-expression trait.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {questionsData.dimensions.map((dimension, index) => {
                const tone = resolveStatTone(dimension.id, index)
                const rawScore = evaluation.summary.scores[dimension.id] ?? 0
                const clampedScore = Math.max(-20, Math.min(20, rawScore))
                const markerPosition = ((clampedScore + 20) / 40) * 100
                const markerTone = clampedScore >= 0 ? tone.positive : tone.negative

                return (
                <article
                  key={dimension.id}
                  className="rounded-xl border border-[#6e5432]/70 bg-[linear-gradient(160deg,rgba(34,26,37,0.86)_0%,rgba(20,16,25,0.9)_100%)] p-5 shadow-[inset_0_0_26px_rgba(0,0,0,0.26)]"
                >
                  <h3 className="font-title text-2xl text-[#f2d7a0]">{dimension.label}</h3>
                  <p className="mt-2 font-body text-base text-[#e6d7bb]">{dimension.description ?? 'Core personality axis.'}</p>

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between font-body text-sm text-[#ceb58d]">
                      <span>{dimension.left ?? 'Low'}</span>
                      <span>{dimension.right ?? 'High'}</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-[#3a2d26]">
                      <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-full opacity-80" style={{ backgroundColor: tone.negative }} />
                      <div className="absolute inset-y-0 right-0 w-1/2 rounded-r-full opacity-85" style={{ backgroundColor: tone.positive }} />
                      <span
                        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f6dca9]"
                        style={{
                          left: `${markerPosition}%`,
                          backgroundColor: markerTone,
                        }}
                      />
                    </div>
                  </div>
                </article>
                )
              })}
            </div>
          </section>
        </div>
      )}

      <div ref={hiddenCaptureRef} className="pointer-events-none fixed left-[-10000px] top-0 opacity-0">
        <ResultCard result={evaluation.winner} scores={evaluation.summary.scores} dimensions={questionsData.dimensions} exportMode />
      </div>

      {isDev && (
        <DebugPanel
          open={debugOpen}
          onToggle={() => setDebugOpen((value) => !value)}
          debug={evaluation.debug}
          summary={evaluation.summary}
        />
      )}
    </main>
  )
}
