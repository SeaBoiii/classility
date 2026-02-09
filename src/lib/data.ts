import questionsRaw from '../../data/questions.json'
import resultsRaw from '../../data/results.json'
import type { DimensionId, QuestionsData, ResultsData } from '../types'

export const questionsData = questionsRaw as QuestionsData
export const resultsData = resultsRaw as ResultsData

export const dimensions = questionsData.dimensions
export const dimensionOrder = dimensions.map((item) => item.id)
export const dimensionLabelMap = dimensions.reduce<Record<DimensionId, string>>((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {})

if (questionsData.questions.length !== 20) {
  throw new Error(`Expected 20 questions, found ${questionsData.questions.length}.`)
}

if (resultsData.results.length !== 16) {
  throw new Error(`Expected 16 results, found ${resultsData.results.length}.`)
}
