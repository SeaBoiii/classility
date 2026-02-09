import { cpus } from 'node:os'
import { copyFile, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'

type QuestionsMatrix = number[][][]

interface DimensionsFile {
  dimensions: Array<{ id: string }>
}

interface QuestionOptionFile {
  text: string
  weights: Record<string, number>
}

interface QuestionFileEntry {
  id: string
  prompt: string
  options: QuestionOptionFile[]
  image?: string
}

interface QuestionsFile {
  questions: QuestionFileEntry[]
}

type RawCondition =
  | { type: 'min'; dim: string; value: number }
  | { type: 'max_le'; dim: string; value: number }
  | { type: 'max_ge'; dim: string; value: number }
  | { type: 'diff_greater'; a: string; b: string; value: number }
  | { type: 'diff_abs_lte'; a: string; b: string; value: number }
  | { type: 'top_is'; dim: string }
  | { type: 'not_top_is'; dim: string }
  | { type: 'rank_is'; dim: string; rank: number }
  | { type: 'top_diff_gte'; value: number }
  | { type: 'top_diff_lte'; value: number }
  | { type: 'total_min'; value: number }
  | { type: 'total_max'; value: number }
  | { type: 'sum_min'; dims: string[]; value: number }
  | { type: 'sum_max'; dims: string[]; value: number }
  | { type: 'spread_between'; min: number; max: number }

interface ResultFileEntry {
  id: string
  priority: number
  conditions: RawCondition[]
}

interface ResultsFile {
  results: ResultFileEntry[]
}

type NormalizedCondition =
  | { type: 'min'; dim: number; value: number }
  | { type: 'max_le'; dim: number; value: number }
  | { type: 'max_ge'; dim: number; value: number }
  | { type: 'diff_greater'; a: number; b: number; value: number }
  | { type: 'diff_abs_lte'; a: number; b: number; value: number }
  | { type: 'top_is'; dim: number }
  | { type: 'not_top_is'; dim: number }
  | { type: 'rank_is'; dim: number; rank: number }
  | { type: 'top_diff_gte'; value: number }
  | { type: 'top_diff_lte'; value: number }
  | { type: 'total_min'; value: number }
  | { type: 'total_max'; value: number }
  | { type: 'sum_min'; dims: number[]; value: number }
  | { type: 'sum_max'; dims: number[]; value: number }
  | { type: 'spread_between'; min: number; max: number }

interface NormalizedResult {
  id: string
  priority: number
  conditions: NormalizedCondition[]
}

interface Summary {
  scores: number[]
  total: number
  spread: number
  topDim: number
  secondDim: number
  topScore: number
  secondScore: number
  ranks: number[]
}

interface ResultCheck {
  passed: boolean
  passCount: number
  totalCount: number
  totalGap: number
}

interface SearchConfig {
  searchIterations: number
  searchRestarts: number
  answerMutationSpan: number
}

interface WorkerInitData {
  dimensionsCount: number
  results: NormalizedResult[]
  searchConfig: SearchConfig
}

interface SearchTask {
  taskId: number
  matrix: QuestionsMatrix
  targetIndex: number
  seed: number
}

interface SearchTaskResult {
  taskId: number
  targetIndex: number
  found: boolean
  bestScore: number
  bestAnswers: number[]
}

interface SearchTaskError {
  taskId: number
  error: string
}

interface ReachabilityResult {
  foundCount: number
  totalCount: number
  reachability: number
  utility: number
  foundIds: string[]
  missingIds: string[]
  classResults: SearchTaskResult[]
}

interface CliOptions {
  targetReachability: number
  timeoutMs: number
  workerCount: number
  searchIterations: number
  searchRestarts: number
  answerMutationSpan: number
  weightMutationCount: number
  weightMutationStep: number
  weightLimit: number
  maxAttempts: number
  write: boolean
  seed: number
  dimensionsPath: string
  questionsPath: string
  resultsPath: string
}

interface LoadedData {
  dimensions: string[]
  questionsFile: QuestionsFile
  questionsMatrix: QuestionsMatrix
  results: NormalizedResult[]
}

interface WorkerPending {
  resolve: (value: SearchTaskResult) => void
  reject: (reason: unknown) => void
}

const SCORE_MIN = -20
const SCORE_MAX = 20
const REACHABILITY_SCALE = 1_000_000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createRandomAnswers(
  matrix: QuestionsMatrix,
  random: () => number,
): number[] {
  return matrix.map((question) => Math.floor(random() * question.length))
}

function mutateAnswers(
  current: number[],
  matrix: QuestionsMatrix,
  random: () => number,
  mutationSpan: number,
): number[] {
  const next = [...current]
  const steps = 1 + Math.floor(random() * Math.max(1, mutationSpan))

  for (let step = 0; step < steps; step += 1) {
    const questionIndex = Math.floor(random() * matrix.length)
    const optionCount = matrix[questionIndex].length
    if (optionCount <= 1) {
      continue
    }

    const previousOption = next[questionIndex]
    let nextOption = previousOption
    while (nextOption === previousOption) {
      nextOption = Math.floor(random() * optionCount)
    }
    next[questionIndex] = nextOption
  }

  return next
}

function scoreAnswers(
  dimensionsCount: number,
  matrix: QuestionsMatrix,
  answers: number[],
): number[] {
  const scores = Array.from({ length: dimensionsCount }, () => 0)

  for (let questionIndex = 0; questionIndex < matrix.length; questionIndex += 1) {
    const optionIndex = answers[questionIndex]
    const option = matrix[questionIndex][optionIndex]
    if (!option) {
      continue
    }

    for (let dimIndex = 0; dimIndex < dimensionsCount; dimIndex += 1) {
      scores[dimIndex] += option[dimIndex] ?? 0
    }
  }

  return scores.map((value) => clamp(Math.round(value), SCORE_MIN, SCORE_MAX))
}

function summarizeScores(scores: number[]): Summary {
  const ordered = scores
    .map((score, dimIndex) => ({ score, dimIndex }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score
      }
      return a.dimIndex - b.dimIndex
    })

  const top = ordered[0]
  const second = ordered[1] ?? ordered[0]
  const ranks = Array.from({ length: scores.length }, () => 0)

  ordered.forEach((entry, index) => {
    ranks[entry.dimIndex] = index + 1
  })

  const total = scores.reduce((sum, value) => sum + value, 0)
  const maxValue = Math.max(...scores)
  const minValue = Math.min(...scores)

  return {
    scores,
    total,
    spread: maxValue - minValue,
    topDim: top.dimIndex,
    secondDim: second.dimIndex,
    topScore: top.score,
    secondScore: second.score,
    ranks,
  }
}

function conditionGap(condition: NormalizedCondition, summary: Summary): number {
  const scores = summary.scores

  switch (condition.type) {
    case 'min':
      return Math.max(0, condition.value - scores[condition.dim])
    case 'max_le':
      return Math.max(0, scores[condition.dim] - condition.value)
    case 'max_ge':
      return Math.max(0, condition.value - scores[condition.dim])
    case 'diff_greater': {
      const diff = scores[condition.a] - scores[condition.b]
      return diff > condition.value ? 0 : condition.value - diff + 1
    }
    case 'diff_abs_lte': {
      const diff = Math.abs(scores[condition.a] - scores[condition.b])
      return Math.max(0, diff - condition.value)
    }
    case 'top_is':
      return summary.topDim === condition.dim ? 0 : 1
    case 'not_top_is':
      return summary.topDim !== condition.dim ? 0 : 1
    case 'rank_is':
      return Math.abs(summary.ranks[condition.dim] - condition.rank)
    case 'top_diff_gte': {
      const diff = summary.topScore - summary.secondScore
      return Math.max(0, condition.value - diff)
    }
    case 'top_diff_lte': {
      const diff = summary.topScore - summary.secondScore
      return Math.max(0, diff - condition.value)
    }
    case 'total_min':
      return Math.max(0, condition.value - summary.total)
    case 'total_max':
      return Math.max(0, summary.total - condition.value)
    case 'sum_min': {
      const subset = condition.dims.reduce((sum, index) => sum + scores[index], 0)
      return Math.max(0, condition.value - subset)
    }
    case 'sum_max': {
      const subset = condition.dims.reduce((sum, index) => sum + scores[index], 0)
      return Math.max(0, subset - condition.value)
    }
    case 'spread_between':
      if (summary.spread < condition.min) {
        return condition.min - summary.spread
      }
      if (summary.spread > condition.max) {
        return summary.spread - condition.max
      }
      return 0
    default:
      return 1
  }
}

function evaluateResults(
  summary: Summary,
  results: NormalizedResult[],
): { checks: ResultCheck[]; winnerIndex: number } {
  const checks = results.map<ResultCheck>((result) => {
    let passCount = 0
    let totalGap = 0

    for (const condition of result.conditions) {
      const gap = conditionGap(condition, summary)
      totalGap += gap
      if (gap === 0) {
        passCount += 1
      }
    }

    return {
      passed: passCount === result.conditions.length,
      passCount,
      totalCount: result.conditions.length,
      totalGap,
    }
  })

  let winnerIndex = 0
  let bestPriority = Number.NEGATIVE_INFINITY

  checks.forEach((check, index) => {
    if (!check.passed) {
      return
    }

    const priority = results[index].priority
    if (priority > bestPriority) {
      bestPriority = priority
      winnerIndex = index
    }
  })

  return { checks, winnerIndex }
}

function outranks(
  candidateIndex: number,
  targetIndex: number,
  results: NormalizedResult[],
): boolean {
  const candidatePriority = results[candidateIndex].priority
  const targetPriority = results[targetIndex].priority
  if (candidatePriority !== targetPriority) {
    return candidatePriority > targetPriority
  }
  return candidateIndex < targetIndex
}

function objectiveForTarget(
  targetIndex: number,
  winnerIndex: number,
  checks: ResultCheck[],
  results: NormalizedResult[],
): number {
  if (winnerIndex === targetIndex) {
    return 1_000_000_000
  }

  const target = checks[targetIndex]
  let blockers = 0

  for (let index = 0; index < checks.length; index += 1) {
    if (index === targetIndex) {
      continue
    }
    if (!checks[index].passed) {
      continue
    }
    if (outranks(index, targetIndex, results)) {
      blockers += 1
    }
  }

  const passed = target.passCount
  const failed = target.totalCount - target.passCount

  return (
    passed * 1200 -
    failed * 1000 -
    target.totalGap * 85 -
    blockers * 1500
  )
}

function searchForTarget(
  matrix: QuestionsMatrix,
  targetIndex: number,
  seed: number,
  dimensionsCount: number,
  results: NormalizedResult[],
  config: SearchConfig,
): SearchTaskResult {
  const random = mulberry32(seed)
  let bestAnswers = createRandomAnswers(matrix, random)
  let bestScore = Number.NEGATIVE_INFINITY

  for (let restart = 0; restart < config.searchRestarts; restart += 1) {
    let currentAnswers =
      restart === 0 ? [...bestAnswers] : createRandomAnswers(matrix, random)
    let currentScore = Number.NEGATIVE_INFINITY

    const currentSummary = summarizeScores(
      scoreAnswers(dimensionsCount, matrix, currentAnswers),
    )
    const currentEvaluation = evaluateResults(currentSummary, results)
    currentScore = objectiveForTarget(
      targetIndex,
      currentEvaluation.winnerIndex,
      currentEvaluation.checks,
      results,
    )

    if (currentEvaluation.winnerIndex === targetIndex) {
      return {
        taskId: 0,
        targetIndex,
        found: true,
        bestScore: currentScore,
        bestAnswers: currentAnswers,
      }
    }

    if (currentScore > bestScore) {
      bestScore = currentScore
      bestAnswers = [...currentAnswers]
    }

    let temperature = 1
    for (let iteration = 0; iteration < config.searchIterations; iteration += 1) {
      const candidateAnswers = mutateAnswers(
        currentAnswers,
        matrix,
        random,
        config.answerMutationSpan,
      )
      const candidateSummary = summarizeScores(
        scoreAnswers(dimensionsCount, matrix, candidateAnswers),
      )
      const candidateEvaluation = evaluateResults(candidateSummary, results)
      const candidateScore = objectiveForTarget(
        targetIndex,
        candidateEvaluation.winnerIndex,
        candidateEvaluation.checks,
        results,
      )

      if (candidateEvaluation.winnerIndex === targetIndex) {
        return {
          taskId: 0,
          targetIndex,
          found: true,
          bestScore: candidateScore,
          bestAnswers: candidateAnswers,
        }
      }

      if (candidateScore > bestScore) {
        bestScore = candidateScore
        bestAnswers = [...candidateAnswers]
      }

      const delta = candidateScore - currentScore
      const acceptanceThreshold = Math.exp(
        clamp(delta / Math.max(1, temperature * 700), -60, 60),
      )
      if (delta >= 0 || random() < acceptanceThreshold) {
        currentAnswers = candidateAnswers
        currentScore = candidateScore
      }

      temperature *= 0.9997
    }
  }

  return {
    taskId: 0,
    targetIndex,
    found: false,
    bestScore,
    bestAnswers,
  }
}

class WorkerPool {
  private workers: Worker[] = []
  private pending = new Map<number, WorkerPending>()
  private nextWorker = 0
  private taskCounter = 0

  constructor(
    workerCount: number,
    initData: WorkerInitData,
  ) {
    const workerUrl = new URL('./tune-reachability-worker.mjs', import.meta.url)

    for (let index = 0; index < workerCount; index += 1) {
      const worker = new Worker(workerUrl, {
        workerData: initData,
        type: 'module',
      })

      worker.on('message', (message: SearchTaskResult | SearchTaskError) => {
        const pending = this.pending.get(message.taskId)
        if (!pending) {
          return
        }

        this.pending.delete(message.taskId)
        if ('error' in message) {
          pending.reject(new Error(message.error))
          return
        }
        pending.resolve(message)
      })

      worker.on('error', (error) => {
        const unresolved = Array.from(this.pending.values())
        this.pending.clear()
        unresolved.forEach(({ reject }) => reject(error))
      })

      this.workers.push(worker)
    }
  }

  runTask(task: Omit<SearchTask, 'taskId'>): Promise<SearchTaskResult> {
    const taskId = this.taskCounter + 1
    this.taskCounter = taskId
    const worker = this.workers[this.nextWorker % this.workers.length]
    this.nextWorker += 1

    return new Promise((resolve, reject) => {
      this.pending.set(taskId, { resolve, reject })
      worker.postMessage({ ...task, taskId })
    })
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.terminate()))
  }
}

function parseArgMap(argv: string[]): Map<string, string | boolean> {
  const args = new Map<string, string | boolean>()

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }

    const key = token.slice(2)
    const maybeValue = argv[index + 1]
    if (maybeValue && !maybeValue.startsWith('--')) {
      args.set(key, maybeValue)
      index += 1
      continue
    }

    args.set(key, true)
  }

  return args
}

function getNumberArg(
  args: Map<string, string | boolean>,
  key: string,
  fallback: number,
): number {
  const raw = args.get(key)
  if (raw === undefined || raw === true) {
    return fallback
  }

  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric value for --${key}: ${raw}`)
  }
  return value
}

function getBooleanArg(
  args: Map<string, string | boolean>,
  key: string,
  fallback: boolean,
): boolean {
  const raw = args.get(key)
  if (raw === undefined) {
    return fallback
  }
  if (raw === true) {
    return true
  }
  const normalized = raw.toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false
  }
  return fallback
}

function getStringArg(
  args: Map<string, string | boolean>,
  key: string,
  fallback: string,
): string {
  const raw = args.get(key)
  if (!raw || raw === true) {
    return fallback
  }
  return raw
}

function buildCliOptions(argv: string[]): CliOptions {
  const args = parseArgMap(argv)

  const cpuCount = cpus().length
  const explicitWorkers = getNumberArg(args, 'workers', 0)
  const workerCount =
    explicitWorkers > 0
      ? Math.floor(explicitWorkers)
      : Math.max(1, cpuCount - 1)

  const rawTarget = getNumberArg(args, 'target-reachability', 1)
  const targetReachability =
    rawTarget > 1 ? clamp(rawTarget / 100, 0, 1) : clamp(rawTarget, 0, 1)

  const timeoutMs = Math.max(30_000, Math.floor(getNumberArg(args, 'timeout-ms', 3_600_000)))
  const maxAttempts = Math.max(1, Math.floor(getNumberArg(args, 'max-attempts', Number.MAX_SAFE_INTEGER)))

  return {
    targetReachability,
    timeoutMs,
    workerCount: Math.max(1, workerCount),
    searchIterations: Math.max(100, Math.floor(getNumberArg(args, 'search-iterations', 8_000))),
    searchRestarts: Math.max(1, Math.floor(getNumberArg(args, 'search-restarts', 16))),
    answerMutationSpan: Math.max(1, Math.floor(getNumberArg(args, 'answer-mutation-span', 2))),
    weightMutationCount: Math.max(1, Math.floor(getNumberArg(args, 'weight-mutation-count', 8))),
    weightMutationStep: Math.max(1, Math.floor(getNumberArg(args, 'weight-mutation-step', 3))),
    weightLimit: Math.max(1, Math.floor(getNumberArg(args, 'weight-limit', 20))),
    maxAttempts,
    write: getBooleanArg(args, 'write', false),
    seed: Math.floor(getNumberArg(args, 'seed', Date.now() ^ hashString(String(process.pid)))),
    dimensionsPath: path.resolve(rootDir, getStringArg(args, 'dimensions', 'data/dimensions.json')),
    questionsPath: path.resolve(rootDir, getStringArg(args, 'questions', 'data/questions.json')),
    resultsPath: path.resolve(rootDir, getStringArg(args, 'results', 'data/results.json')),
  }
}

function normalizeCondition(
  condition: RawCondition,
  dimIndexById: Map<string, number>,
): NormalizedCondition {
  const mapDim = (id: string): number => {
    const index = dimIndexById.get(id)
    if (index === undefined) {
      throw new Error(`Unknown dimension "${id}" referenced in result conditions.`)
    }
    return index
  }

  switch (condition.type) {
    case 'min':
      return { type: 'min', dim: mapDim(condition.dim), value: condition.value }
    case 'max_le':
      return { type: 'max_le', dim: mapDim(condition.dim), value: condition.value }
    case 'max_ge':
      return { type: 'max_ge', dim: mapDim(condition.dim), value: condition.value }
    case 'diff_greater':
      return {
        type: 'diff_greater',
        a: mapDim(condition.a),
        b: mapDim(condition.b),
        value: condition.value,
      }
    case 'diff_abs_lte':
      return {
        type: 'diff_abs_lte',
        a: mapDim(condition.a),
        b: mapDim(condition.b),
        value: condition.value,
      }
    case 'top_is':
      return { type: 'top_is', dim: mapDim(condition.dim) }
    case 'not_top_is':
      return { type: 'not_top_is', dim: mapDim(condition.dim) }
    case 'rank_is':
      return { type: 'rank_is', dim: mapDim(condition.dim), rank: condition.rank }
    case 'top_diff_gte':
      return { type: 'top_diff_gte', value: condition.value }
    case 'top_diff_lte':
      return { type: 'top_diff_lte', value: condition.value }
    case 'total_min':
      return { type: 'total_min', value: condition.value }
    case 'total_max':
      return { type: 'total_max', value: condition.value }
    case 'sum_min':
      return {
        type: 'sum_min',
        dims: condition.dims.map(mapDim),
        value: condition.value,
      }
    case 'sum_max':
      return {
        type: 'sum_max',
        dims: condition.dims.map(mapDim),
        value: condition.value,
      }
    case 'spread_between':
      return { type: 'spread_between', min: condition.min, max: condition.max }
    default:
      throw new Error(`Unsupported condition type "${String(condition)}".`)
  }
}

function questionsToMatrix(
  questions: QuestionFileEntry[],
  dimensions: string[],
): QuestionsMatrix {
  const dimIndexById = new Map(dimensions.map((id, index) => [id, index]))

  return questions.map((question) =>
    question.options.map((option) => {
      const vector = Array.from({ length: dimensions.length }, () => 0)
      Object.entries(option.weights ?? {}).forEach(([dimId, rawValue]) => {
        const dimIndex = dimIndexById.get(dimId)
        if (dimIndex === undefined) {
          return
        }
        const value = Number(rawValue)
        vector[dimIndex] = Number.isFinite(value) ? Math.round(value) : 0
      })
      return vector
    }),
  )
}

function cloneMatrix(matrix: QuestionsMatrix): QuestionsMatrix {
  return matrix.map((question) => question.map((option) => [...option]))
}

function applyWeightMutations(
  matrix: QuestionsMatrix,
  dimensionsCount: number,
  mutationCount: number,
  mutationStep: number,
  weightLimit: number,
  random: () => number,
): void {
  const totalMutations = 1 + Math.floor(random() * mutationCount)

  for (let index = 0; index < totalMutations; index += 1) {
    const questionIndex = Math.floor(random() * matrix.length)
    const optionIndex = Math.floor(random() * matrix[questionIndex].length)
    const dimIndex = Math.floor(random() * dimensionsCount)

    let delta = 0
    while (delta === 0) {
      delta = Math.floor(random() * (mutationStep * 2 + 1)) - mutationStep
    }

    const current = matrix[questionIndex][optionIndex][dimIndex]
    matrix[questionIndex][optionIndex][dimIndex] = clamp(
      Math.round(current + delta),
      -weightLimit,
      weightLimit,
    )
  }
}

function matrixToQuestionsFile(
  original: QuestionsFile,
  matrix: QuestionsMatrix,
  dimensions: string[],
): QuestionsFile {
  const nextQuestions = original.questions.map((question, questionIndex) => ({
    ...question,
    options: question.options.map((option, optionIndex) => {
      const weights = Object.fromEntries(
        dimensions.map((dimId, dimIndex) => [
          dimId,
          matrix[questionIndex][optionIndex][dimIndex],
        ]),
      )
      return {
        ...option,
        weights,
      }
    }),
  }))

  return {
    ...original,
    questions: nextQuestions,
  }
}

async function loadData(options: CliOptions): Promise<LoadedData> {
  const [dimensionsRaw, questionsRaw, resultsRaw] = await Promise.all([
    readFile(options.dimensionsPath, 'utf8'),
    readFile(options.questionsPath, 'utf8'),
    readFile(options.resultsPath, 'utf8'),
  ])

  const dimensionsFile = JSON.parse(dimensionsRaw) as DimensionsFile
  const questionsFile = JSON.parse(questionsRaw) as QuestionsFile
  const resultsFile = JSON.parse(resultsRaw) as ResultsFile

  const dimensions = dimensionsFile.dimensions.map((item) => item.id)
  const dimIndexById = new Map(dimensions.map((id, index) => [id, index]))
  const normalizedResults = resultsFile.results.map<NormalizedResult>((result) => ({
    id: result.id,
    priority: result.priority,
    conditions: result.conditions.map((condition) =>
      normalizeCondition(condition, dimIndexById),
    ),
  }))

  const questionsMatrix = questionsToMatrix(questionsFile.questions, dimensions)
  return {
    dimensions,
    questionsFile,
    questionsMatrix,
    results: normalizedResults,
  }
}

function compareReachabilityResults(
  left: ReachabilityResult,
  right: ReachabilityResult,
): number {
  if (left.foundCount !== right.foundCount) {
    return left.foundCount - right.foundCount
  }
  return left.utility - right.utility
}

async function evaluateReachability(
  matrix: QuestionsMatrix,
  results: NormalizedResult[],
  pool: WorkerPool,
  seedBase: number,
): Promise<ReachabilityResult> {
  const tasks = results.map((_, targetIndex) =>
    pool.runTask({
      matrix,
      targetIndex,
      seed: seedBase + targetIndex * 7919,
    }),
  )

  const classResults = await Promise.all(tasks)
  classResults.sort((a, b) => a.targetIndex - b.targetIndex)

  const foundIds: string[] = []
  const missingIds: string[] = []
  let utility = 0

  classResults.forEach((result, index) => {
    if (result.found) {
      foundIds.push(results[index].id)
      utility += REACHABILITY_SCALE
      return
    }
    missingIds.push(results[index].id)
    utility += result.bestScore
  })

  const foundCount = foundIds.length
  const totalCount = results.length

  return {
    foundCount,
    totalCount,
    reachability: foundCount / totalCount,
    utility,
    foundIds,
    missingIds,
    classResults,
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function printSummary(prefix: string, result: ReachabilityResult): void {
  console.log(
    `${prefix} ${formatPercent(result.reachability)} (${result.foundCount}/${result.totalCount})`,
  )
  if (result.missingIds.length > 0) {
    console.log(`Missing classes: ${result.missingIds.join(', ')}`)
  }
}

async function runMain(): Promise<void> {
  const options = buildCliOptions(process.argv.slice(2))
  const loaded = await loadData(options)
  const searchConfig: SearchConfig = {
    searchIterations: options.searchIterations,
    searchRestarts: options.searchRestarts,
    answerMutationSpan: options.answerMutationSpan,
  }

  console.log('Reachability tuner started.')
  console.log(
    [
      `workers=${options.workerCount}`,
      `target=${formatPercent(options.targetReachability)}`,
      `timeoutMs=${options.timeoutMs}`,
      `searchIterations=${options.searchIterations}`,
      `searchRestarts=${options.searchRestarts}`,
      `weightMutationCount=${options.weightMutationCount}`,
      `weightMutationStep=${options.weightMutationStep}`,
      `write=${String(options.write)}`,
    ].join(' | '),
  )

  const pool = new WorkerPool(options.workerCount, {
    dimensionsCount: loaded.dimensions.length,
    results: loaded.results,
    searchConfig,
  })

  const random = mulberry32(options.seed)
  const startedAt = Date.now()
  const deadline = startedAt + options.timeoutMs
  let attempt = 0

  try {
    let currentMatrix = cloneMatrix(loaded.questionsMatrix)
    let currentResult = await evaluateReachability(
      currentMatrix,
      loaded.results,
      pool,
      options.seed,
    )
    let bestMatrix = cloneMatrix(currentMatrix)
    let bestResult = currentResult

    printSummary('Initial reachability:', bestResult)

    if (bestResult.reachability < options.targetReachability) {
      let temperature = 1

      while (
        Date.now() < deadline &&
        attempt < options.maxAttempts &&
        bestResult.reachability < options.targetReachability
      ) {
        attempt += 1
        const candidate = cloneMatrix(currentMatrix)
        applyWeightMutations(
          candidate,
          loaded.dimensions.length,
          options.weightMutationCount,
          options.weightMutationStep,
          options.weightLimit,
          random,
        )

        const candidateResult = await evaluateReachability(
          candidate,
          loaded.results,
          pool,
          options.seed + attempt * 97,
        )

        const betterThanCurrent = compareReachabilityResults(
          candidateResult,
          currentResult,
        ) > 0

        const delta = candidateResult.utility - currentResult.utility
        const acceptance = Math.exp(
          clamp(delta / Math.max(1, temperature * REACHABILITY_SCALE), -60, 60),
        )
        if (betterThanCurrent || random() < acceptance) {
          currentMatrix = candidate
          currentResult = candidateResult
        }

        if (compareReachabilityResults(candidateResult, bestResult) > 0) {
          bestMatrix = cloneMatrix(candidate)
          bestResult = candidateResult
          const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1)
          printSummary(`Improved @${elapsedSec}s (attempt ${attempt}):`, bestResult)
        } else if (attempt % 10 === 0) {
          const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1)
          printSummary(`Progress @${elapsedSec}s (attempt ${attempt}):`, bestResult)
        }

        temperature *= 0.997
      }
    }

    const reachedTarget = bestResult.reachability >= options.targetReachability
    printSummary('Best reachability:', bestResult)

    if (!options.write) {
      console.log('Run completed without writing changes. Use --write to apply tuned weights.')
      return
    }

    if (!reachedTarget) {
      console.log('Target was not reached before timeout. No file was written.')
      return
    }

    const backupPath = `${options.questionsPath}.bak-${Date.now()}`
    await copyFile(options.questionsPath, backupPath)

    const tunedQuestions = matrixToQuestionsFile(
      loaded.questionsFile,
      bestMatrix,
      loaded.dimensions,
    )
    await writeFile(options.questionsPath, `${JSON.stringify(tunedQuestions, null, 2)}\n`, 'utf8')

    console.log(`Wrote tuned weights to ${path.relative(rootDir, options.questionsPath)}`)
    console.log(`Backup created at ${path.relative(rootDir, backupPath)}`)
  } finally {
    await pool.close()
  }
}

function runWorker(): void {
  const init = workerData as WorkerInitData
  const port = parentPort
  if (!port) {
    throw new Error('Worker started without a parent port.')
  }

  port.on('message', (task: SearchTask) => {
    try {
      const search = searchForTarget(
        task.matrix,
        task.targetIndex,
        task.seed,
        init.dimensionsCount,
        init.results,
        init.searchConfig,
      )

      port.postMessage({
        ...search,
        taskId: task.taskId,
      } satisfies SearchTaskResult)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown worker error.'
      port.postMessage({
        taskId: task.taskId,
        error: message,
      } satisfies SearchTaskError)
    }
  })
}

if (!isMainThread) {
  runWorker()
} else {
  runMain().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
