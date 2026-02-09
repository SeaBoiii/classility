import type { DimensionId, QuestionDefinition, RankEntry, Scores, ScoringSummary } from '../types'

export const SCORE_MIN = -20
export const SCORE_MAX = 20

export function clampScore(value: number): number {
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, Math.round(value)))
}

export function createZeroScores(dimensions: DimensionId[]): Scores {
  return dimensions.reduce<Scores>((acc, dim) => {
    acc[dim] = 0
    return acc
  }, {})
}

export function scoreAnswers(
  dimensions: DimensionId[],
  questions: QuestionDefinition[],
  answers: number[],
): Scores {
  const scores = createZeroScores(dimensions)

  questions.forEach((question, questionIndex) => {
    const optionIndex = answers[questionIndex]
    if (optionIndex === undefined) {
      return
    }

    const option = question.options[optionIndex]
    if (!option) {
      return
    }

    Object.entries(option.weights).forEach(([dim, value]) => {
      if (!dimensions.includes(dim)) {
        return
      }
      scores[dim] += value ?? 0
    })
  })

  dimensions.forEach((dim) => {
    scores[dim] = clampScore(scores[dim])
  })

  return scores
}

export function sumScores(scores: Scores, dims?: DimensionId[]): number {
  const scope = dims ?? Object.keys(scores)
  return scope.reduce((sum, dim) => sum + (scores[dim] ?? 0), 0)
}

export function getOrderedRanks(scores: Scores, dimensions: DimensionId[]): RankEntry[] {
  const orderIndex = dimensions.reduce<Record<DimensionId, number>>((acc, dim, index) => {
    acc[dim] = index
    return acc
  }, {})

  return [...dimensions]
    .sort((a, b) => {
      const scoreDiff = scores[b] - scores[a]
      if (scoreDiff !== 0) {
        return scoreDiff
      }
      return orderIndex[a] - orderIndex[b]
    })
    .map((dim, index) => ({
      dim,
      score: scores[dim],
      rank: index + 1,
    }))
}

export function getRankMap(scores: Scores, dimensions: DimensionId[]): Record<DimensionId, number> {
  return getOrderedRanks(scores, dimensions).reduce<Record<DimensionId, number>>((acc, item) => {
    acc[item.dim] = item.rank
    return acc
  }, {})
}

export function getSpread(scores: Scores, dimensions: DimensionId[]): number {
  if (dimensions.length === 0) {
    return 0
  }

  const values = dimensions.map((dim) => scores[dim] ?? 0)
  return Math.max(...values) - Math.min(...values)
}

export function summarizeScores(scores: Scores, dimensions: DimensionId[]): ScoringSummary {
  const ordered = getOrderedRanks(scores, dimensions)
  const [top, second] = ordered
  const safeSecond: RankEntry = second ?? { dim: top.dim, score: top.score, rank: 2 }

  return {
    scores,
    total: sumScores(scores, dimensions),
    spread: getSpread(scores, dimensions),
    top,
    second: safeSecond,
    ordered,
    ranks: getRankMap(scores, dimensions),
  }
}

export function dominantPair(scores: Scores, dimensions: DimensionId[]): [DimensionId, DimensionId] {
  const ordered = getOrderedRanks(scores, dimensions)
  return [ordered[0].dim, ordered[1]?.dim ?? ordered[0].dim]
}
