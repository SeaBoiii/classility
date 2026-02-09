import dimensionsRaw from '../../data/dimensions.json'
import questionsRaw from '../../data/questions.json'
import resultsRaw from '../../data/results.json'
import type {
  DimensionDataFile,
  DimensionId,
  QuestionDefinition,
  QuestionsData,
  QuestionsOnlyDataFile,
  ResultDefinition,
  ResultsData,
} from '../types'

const textFixes: Array<[from: string, to: string]> = [
  ['â€¦', '…'],
  ['â€”', '—'],
  ['â€“', '–'],
  ['â€™', '’'],
  ['â€œ', '“'],
  ['â€', '”'],
  ['â€˜', '‘'],
  ['Ã¯', 'ï'],
]

function normalizeText(value: string): string {
  return textFixes.reduce((text, [from, to]) => text.split(from).join(to), value)
}

function normalizeDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return normalizeText(value) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDeep(item)) as T
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([key, item]) => [key, normalizeDeep(item)])
    return Object.fromEntries(entries) as T
  }

  return value
}

const dimensionFile = normalizeDeep(dimensionsRaw) as DimensionDataFile
const questionFile = normalizeDeep(questionsRaw) as QuestionsOnlyDataFile
const resultsFile = normalizeDeep(resultsRaw) as ResultsData

const hydratedResults = resultsFile.results.map<ResultDefinition>((result) => {
  return {
    ...result,
    showcaseScores: undefined,
  }
})

export const questionsData: QuestionsData = {
  dimensions: dimensionFile.dimensions,
  questions: questionFile.questions.map<QuestionDefinition>((question) => ({
    ...question,
    image: question.image ?? '',
  })),
}

export const resultsData: ResultsData = {
  results: hydratedResults,
}

export const dimensions = questionsData.dimensions
export const dimensionOrder = dimensions.map((item) => item.id)
export const dimensionLabelMap = dimensions.reduce<Record<DimensionId, string>>((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {})

if (questionsData.questions.length === 0) {
  throw new Error('No questions found in data/questions.json.')
}

if (questionsData.questions.some((question) => question.options.length !== 4)) {
  throw new Error('Each question must provide exactly 4 options.')
}

if (resultsData.results.length === 0) {
  throw new Error('No class results found in data/results.json.')
}
