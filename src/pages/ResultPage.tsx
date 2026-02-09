import { toPng } from 'html-to-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DebugPanel } from '../components/DebugPanel'
import { ResultCard } from '../components/ResultCard'
import { TextureOverlay } from '../components/TextureOverlay'
import { dimensionOrder, questionsData, resultsData } from '../lib/data'
import { evaluateResults } from '../lib/evaluator'
import { seededChoices } from '../lib/seed'
import { scoreAnswers } from '../lib/scoring'
import { loadAttempt } from '../lib/storage'

interface ResultLocationState {
  answers?: number[]
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
  const navigate = useNavigate()
  const location = useLocation()
  const scale = useCardScale()
  const [debugOpen, setDebugOpen] = useState(false)
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
    return (
      <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_30%_10%,#1f1a2a_0%,#0c0c12_60%,#09090f_100%)] p-8 text-[#f3e6cb]">
        <TextureOverlay opacity={0.22} />
        <section className="relative mx-auto mt-24 max-w-2xl rounded-xl border border-[#6f5635] bg-[#16131c]/90 p-8 text-center">
          <h1 className="font-title text-3xl text-[#f4dca8]">No quiz attempt found</h1>
          <p className="mt-3 font-body text-lg text-[#e0d0ad]">
            Take the quiz first, or use /#/result?seed=demo for a deterministic debug run.
          </p>
          <button
            type="button"
            onClick={() => navigate('/quiz')}
            className="mt-6 rounded-md border border-[#bd9b5c] px-5 py-2 font-title text-xs tracking-[0.16em] uppercase text-[#f2daa5] transition hover:bg-[#2a2013] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffd68b]"
          >
            Start Quiz
          </button>
        </section>
      </main>
    )
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

        <div className="mb-4 rounded-lg border border-[#5c452c] bg-[#17131d]/75 px-4 py-3 font-body text-sm text-[#d9c6a1]">
          CLI export command: <code className="rounded bg-[#261d12] px-2 py-1 text-[#f2d59b]">npm run export -- --id {evaluation.winner.id}</code>
          {seed && (
            <span className="ml-2">
              seed: <code className="rounded bg-[#261d12] px-2 py-1 text-[#f2d59b]">{seed}</code>
            </span>
          )}
        </div>

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

      <div ref={hiddenCaptureRef} className="pointer-events-none fixed left-[-10000px] top-0 opacity-0">
        <ResultCard result={evaluation.winner} scores={evaluation.summary.scores} dimensions={questionsData.dimensions} />
      </div>

      <DebugPanel open={debugOpen} onToggle={() => setDebugOpen((value) => !value)} debug={evaluation.debug} summary={evaluation.summary} />
    </main>
  )
}
