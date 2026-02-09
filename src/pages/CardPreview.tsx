import { useLocation } from 'react-router-dom'
import { ResultCard } from '../components/ResultCard'
import { sampleResult } from '../data/sampleResult'

export function CardPreview() {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const exportMode = params.get('export') === '1'

  return (
    <main className="card-preview relative">
      <ResultCard result={sampleResult} exportMode={exportMode} />
    </main>
  )
}
