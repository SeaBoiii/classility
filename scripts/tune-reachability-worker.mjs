import { parentPort, workerData } from 'node:worker_threads'

const SCORE_MIN = -20
const SCORE_MAX = 20

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function createRandomAnswers(matrix, random) {
  return matrix.map((question) => Math.floor(random() * question.length))
}

function mutateAnswers(current, matrix, random, mutationSpan) {
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

function scoreAnswers(dimensionsCount, matrix, answers) {
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

function summarizeScores(scores) {
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

function conditionGap(condition, summary) {
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

function evaluateResults(summary, results) {
  const checks = results.map((result) => {
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

  const standardEntries = checks
    .map((check, index) => ({ check, index, result: results[index] }))
    .filter(({ result }) => !result.isFallback)
  const fallbackEntry = checks
    .map((check, index) => ({ check, index, result: results[index] }))
    .find(({ result }) => result.isFallback)

  const eligible = standardEntries
    .filter(({ check }) => check.passed)
    .sort((left, right) => {
      const priorityDiff = right.result.priority - left.result.priority
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      return left.index - right.index
    })

  if (eligible.length > 0) {
    return { checks, winnerIndex: eligible[0].index }
  }

  const nearMatch = [...standardEntries].sort((left, right) => {
    if (right.check.passCount !== left.check.passCount) {
      return right.check.passCount - left.check.passCount
    }

    const leftFailedCount = left.check.totalCount - left.check.passCount
    const rightFailedCount = right.check.totalCount - right.check.passCount
    if (leftFailedCount !== rightFailedCount) {
      return leftFailedCount - rightFailedCount
    }

    if (left.check.totalGap !== right.check.totalGap) {
      return left.check.totalGap - right.check.totalGap
    }

    const priorityDiff = right.result.priority - left.result.priority
    if (priorityDiff !== 0) {
      return priorityDiff
    }
    return left.index - right.index
  })[0]

  if (nearMatch && nearMatch.check.passCount > 0) {
    return { checks, winnerIndex: nearMatch.index }
  }

  if (fallbackEntry) {
    return { checks, winnerIndex: fallbackEntry.index }
  }

  return { checks, winnerIndex: nearMatch?.index ?? 0 }
}

function outranks(candidateIndex, targetIndex, results) {
  const candidatePriority = results[candidateIndex].priority
  const targetPriority = results[targetIndex].priority
  if (candidatePriority !== targetPriority) {
    return candidatePriority > targetPriority
  }
  return candidateIndex < targetIndex
}

function objectiveForTarget(targetIndex, winnerIndex, checks, results) {
  if (winnerIndex === targetIndex) {
    return 1_000_000_000
  }

  const target = checks[targetIndex]
  let blockers = 0

  for (let index = 0; index < checks.length; index += 1) {
    if (index === targetIndex) {
      continue
    }
    if (results[index].isFallback) {
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

function searchForTarget(matrix, targetIndex, seed, dimensionsCount, results, config) {
  const random = mulberry32(seed)
  let bestAnswers = createRandomAnswers(matrix, random)
  let bestScore = Number.NEGATIVE_INFINITY

  for (let restart = 0; restart < config.searchRestarts; restart += 1) {
    let currentAnswers = restart === 0 ? [...bestAnswers] : createRandomAnswers(matrix, random)

    const currentSummary = summarizeScores(
      scoreAnswers(dimensionsCount, matrix, currentAnswers),
    )
    const currentEvaluation = evaluateResults(currentSummary, results)
    let currentScore = objectiveForTarget(
      targetIndex,
      currentEvaluation.winnerIndex,
      currentEvaluation.checks,
      results,
    )

    if (currentEvaluation.winnerIndex === targetIndex) {
      return {
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
    found: false,
    bestScore,
    bestAnswers,
  }
}

if (!parentPort) {
  throw new Error('Worker started without a parent port.')
}

parentPort.on('message', (task) => {
  try {
    const search = searchForTarget(
      task.matrix,
      task.targetIndex,
      task.seed,
      workerData.dimensionsCount,
      workerData.results,
      workerData.searchConfig,
    )

    parentPort.postMessage({
      taskId: task.taskId,
      targetIndex: task.targetIndex,
      found: search.found,
      bestScore: search.bestScore,
      bestAnswers: search.bestAnswers,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown worker error.'
    parentPort.postMessage({
      taskId: task.taskId,
      error: message,
    })
  }
})
