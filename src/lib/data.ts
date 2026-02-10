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

const spriteModules = import.meta.glob('../assets/class_sprites/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const sceneModules = import.meta.glob('../assets/scenes/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const crestModules = import.meta.glob('../assets/crests/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const equipmentModules = import.meta.glob('../assets/equipments/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

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

function resolveAsset(pathOrFilename: string | undefined, modules: Record<string, string>): string | undefined {
  if (!pathOrFilename) {
    return undefined
  }

  const normalized = pathOrFilename.replace(/\\/g, '/').replace(/^\.?\//, '')
  const entries = Object.entries(modules)

  const exactMatch = entries.find(([modulePath]) => {
    return modulePath.endsWith(`/${normalized}`) || modulePath.endsWith(normalized)
  })
  if (exactMatch) {
    return exactMatch[1]
  }

  const filename = normalized.split('/').pop()
  if (!filename) {
    return undefined
  }

  const filenameMatch = entries.find(([modulePath]) => modulePath.endsWith(`/${filename}`))
  return filenameMatch?.[1]
}

function resolveClassSprite(pathOrFilename?: string): string | undefined {
  return resolveAsset(pathOrFilename, spriteModules)
}

function resolveQuestionScene(pathOrFilename?: string): string | undefined {
  return resolveAsset(pathOrFilename, sceneModules)
}

function resolvePartyRoleCrest(pathOrFilename?: string): string | undefined {
  return resolveAsset(pathOrFilename, crestModules)
}

function resolveSignatureEquipment(pathOrFilename?: string): string | undefined {
  return resolveAsset(pathOrFilename, equipmentModules)
}

const dimensionFile = normalizeDeep(dimensionsRaw) as DimensionDataFile
const questionFile = normalizeDeep(questionsRaw) as QuestionsOnlyDataFile
const resultsFile = normalizeDeep(resultsRaw) as ResultsData

const hydratedResults = resultsFile.results.map<ResultDefinition>((result) => {
  const classSprite = resolveClassSprite(result.classSprite) ?? result.classSprite
  const partyRoleCrest =
    resolvePartyRoleCrest(result.partyRoleCrest) ??
    resolvePartyRoleCrest(result.classSprite) ??
    result.partyRoleCrest
  const signatureEquipment =
    resolveSignatureEquipment(result.signatureEquipment) ??
    resolveSignatureEquipment(result.classSprite) ??
    result.signatureEquipment

  return {
    ...result,
    classSprite,
    partyRoleCrest,
    signatureEquipment,
    showcaseScores: undefined,
  }
})

export const questionsData: QuestionsData = {
  dimensions: dimensionFile.dimensions,
  questions: questionFile.questions.map<QuestionDefinition>((question) => ({
    ...question,
    image: resolveQuestionScene(question.image) ?? question.image ?? '',
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
