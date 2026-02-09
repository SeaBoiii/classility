export type DimensionId = string
export type Scores = Record<DimensionId, number>

export interface DimensionDefinition {
  id: DimensionId
  label: string
}

export interface QuestionOption {
  text: string
  weights: Partial<Scores>
}

export interface QuestionDefinition {
  id: string
  prompt: string
  options: QuestionOption[]
  image: string
}

export interface QuestionsData {
  dimensions: DimensionDefinition[]
  questions: QuestionDefinition[]
}

export type Condition =
  | { type: 'min'; dim: DimensionId; value: number }
  | { type: 'max_le'; dim: DimensionId; value: number }
  | { type: 'max_ge'; dim: DimensionId; value: number }
  | { type: 'diff_greater'; a: DimensionId; b: DimensionId; value: number }
  | { type: 'diff_abs_lte'; a: DimensionId; b: DimensionId; value: number }
  | { type: 'top_is'; dim: DimensionId }
  | { type: 'not_top_is'; dim: DimensionId }
  | { type: 'rank_is'; dim: DimensionId; rank: number }
  | { type: 'top_diff_gte'; value: number }
  | { type: 'top_diff_lte'; value: number }
  | { type: 'total_min'; value: number }
  | { type: 'total_max'; value: number }
  | { type: 'sum_min'; dims: DimensionId[]; value: number }
  | { type: 'sum_max'; dims: DimensionId[]; value: number }
  | { type: 'spread_between'; min: number; max: number }

export interface ResultDefinition {
  id: string
  title: string
  tagline: string
  summary: string
  lore: string
  signals: string[]
  priority: number
  conditions: Condition[]
  style: string
  risk: string
  partyRole: string
  growthQuest: string
  signatureItem?: string
  battleHabit?: string
  showcaseScores?: Partial<Scores>
}

export interface ResultsData {
  results: ResultDefinition[]
}

export interface RankEntry {
  dim: DimensionId
  score: number
  rank: number
}

export interface ScoringSummary {
  scores: Scores
  total: number
  spread: number
  top: RankEntry
  second: RankEntry
  ranks: Record<DimensionId, number>
  ordered: RankEntry[]
}

export interface ConditionDebug {
  passed: boolean
  condition: Condition
  description: string
}

export interface ResultDebug {
  passed: boolean
  result: ResultDefinition
  checks: ConditionDebug[]
}
