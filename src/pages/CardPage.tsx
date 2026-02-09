import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { ResultCard } from '../components/ResultCard'
import { dimensionOrder, questionsData, resultsData } from '../lib/data'
import { scoreAnswers } from '../lib/scoring'
import { seededChoices } from '../lib/seed'
import { createShowcaseScores } from '../lib/showcase'

function useCardScale(exportMode: boolean) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (exportMode) {
      return
    }

    const update = () => {
      const widthScale = (window.innerWidth - 20) / 900
      const heightScale = (window.innerHeight - 20) / 1400
      setScale(Math.max(0.2, Math.min(1, widthScale, heightScale)))
    }

    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [exportMode])

  return exportMode ? 1 : scale
}

export function CardPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const result = resultsData.results.find((item) => item.id === id)
  const searchParams = new URLSearchParams(location.search)
  const seed = searchParams.get('seed')
  const exportMode = searchParams.get('export') === '1'
  const scale = useCardScale(exportMode)

  const scores = useMemo(() => {
    if (!result) {
      return null
    }

    if (seed) {
      const answers = seededChoices(seed, questionsData.questions.length, 4)
      return scoreAnswers(dimensionOrder, questionsData.questions, answers)
    }

    return createShowcaseScores(result, dimensionOrder)
  }, [result, seed])

  if (!result || !scores) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent text-sm text-[#dedede]">
        Unknown class id.
      </main>
    )
  }

  if (exportMode) {
    return (
      <main className="flex h-screen w-screen items-start justify-start overflow-hidden bg-transparent p-0">
        <ResultCard result={result} scores={scores} dimensions={questionsData.dimensions} exportMode={true} />
      </main>
    )
  }

  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent p-0">
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
          <ResultCard result={result} scores={scores} dimensions={questionsData.dimensions} exportMode={false} />
        </div>
      </div>
    </main>
  )
}
