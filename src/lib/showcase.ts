import type { DimensionId, ResultDefinition, Scores } from '../types'
import { clampScore, createZeroScores } from './scoring'
import { hashSeed, mulberry32 } from './seed'

export function createShowcaseScores(result: ResultDefinition, dimensions: DimensionId[]): Scores {
  const base = createZeroScores(dimensions)
  if (result.showcaseScores) {
    dimensions.forEach((dim) => {
      base[dim] = clampScore(result.showcaseScores?.[dim] ?? 0)
    })
    return base
  }

  const random = mulberry32(hashSeed(result.id))
  dimensions.forEach((dim) => {
    base[dim] = clampScore(Math.round(random() * 24 - 8))
  })

  return base
}
