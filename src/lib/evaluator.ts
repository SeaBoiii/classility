import type {
  Condition,
  ConditionDebug,
  DimensionId,
  ResultDebug,
  ResultDefinition,
  ScoringSummary,
  Scores,
} from '../types'
import { summarizeScores, sumScores } from './scoring'

interface ConditionContext {
  summary: ScoringSummary
  dimensions: DimensionId[]
}

export interface EvaluationOutput {
  winner: ResultDefinition
  summary: ScoringSummary
  debug: ResultDebug[]
}

function describeCondition(condition: Condition): string {
  switch (condition.type) {
    case 'min':
      return `${condition.dim} >= ${condition.value}`
    case 'max_le':
      return `${condition.dim} <= ${condition.value}`
    case 'max_ge':
      return `${condition.dim} >= ${condition.value}`
    case 'diff_greater':
      return `${condition.a} - ${condition.b} > ${condition.value}`
    case 'diff_abs_lte':
      return `|${condition.a} - ${condition.b}| <= ${condition.value}`
    case 'top_is':
      return `top dimension is ${condition.dim}`
    case 'not_top_is':
      return `top dimension is not ${condition.dim}`
    case 'rank_is':
      return `${condition.dim} rank = ${condition.rank}`
    case 'top_diff_gte':
      return `top - second >= ${condition.value}`
    case 'top_diff_lte':
      return `top - second <= ${condition.value}`
    case 'total_min':
      return `total >= ${condition.value}`
    case 'total_max':
      return `total <= ${condition.value}`
    case 'sum_min':
      return `${condition.dims.join(' + ')} >= ${condition.value}`
    case 'sum_max':
      return `${condition.dims.join(' + ')} <= ${condition.value}`
    case 'spread_between':
      return `spread in [${condition.min}, ${condition.max}]`
    default:
      return 'unknown condition'
  }
}

function checkCondition(condition: Condition, context: ConditionContext): boolean {
  const { summary } = context
  const { scores } = summary

  switch (condition.type) {
    case 'min':
      return (scores[condition.dim] ?? 0) >= condition.value
    case 'max_le':
      return (scores[condition.dim] ?? 0) <= condition.value
    case 'max_ge':
      return (scores[condition.dim] ?? 0) >= condition.value
    case 'diff_greater':
      return (scores[condition.a] ?? 0) - (scores[condition.b] ?? 0) > condition.value
    case 'diff_abs_lte':
      return Math.abs((scores[condition.a] ?? 0) - (scores[condition.b] ?? 0)) <= condition.value
    case 'top_is':
      return summary.top.dim === condition.dim
    case 'not_top_is':
      return summary.top.dim !== condition.dim
    case 'rank_is':
      return summary.ranks[condition.dim] === condition.rank
    case 'top_diff_gte':
      return summary.top.score - summary.second.score >= condition.value
    case 'top_diff_lte':
      return summary.top.score - summary.second.score <= condition.value
    case 'total_min':
      return summary.total >= condition.value
    case 'total_max':
      return summary.total <= condition.value
    case 'sum_min':
      return sumScores(scores, condition.dims) >= condition.value
    case 'sum_max':
      return sumScores(scores, condition.dims) <= condition.value
    case 'spread_between':
      return summary.spread >= condition.min && summary.spread <= condition.max
    default:
      return false
  }
}

function evaluateResult(result: ResultDefinition, context: ConditionContext): ResultDebug {
  const checks = result.conditions.map<ConditionDebug>((condition) => ({
    condition,
    description: describeCondition(condition),
    passed: checkCondition(condition, context),
  }))

  return {
    result,
    checks,
    passed: checks.every((check) => check.passed),
  }
}

export function evaluateResults(
  scores: Scores,
  dimensions: DimensionId[],
  results: ResultDefinition[],
): EvaluationOutput {
  const summary = summarizeScores(scores, dimensions)
  const context: ConditionContext = {
    summary,
    dimensions,
  }

  const debug = results.map((result) => evaluateResult(result, context))
  const eligible = debug
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => entry.passed)
    .sort((a, b) => {
      const priorityDiff = b.entry.result.priority - a.entry.result.priority
      if (priorityDiff !== 0) {
        return priorityDiff
      }
      return a.index - b.index
    })

  const winner = eligible[0]?.entry.result ?? results[0]

  return {
    winner,
    summary,
    debug,
  }
}
