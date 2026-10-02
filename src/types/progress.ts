import type { TrainingSessionState } from '../features/training/types'

export const APP_STATE_VERSION = 1 as const
export const STORAGE_KEY = 'fr-fluency-trainer'
export const WEEKLY_GOAL = 5

export interface SessionRecord {
  id: string
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  /** ISO timestamp of completion. */
  completedAt: string
  durationMinutes: number
  blockCount: number
  fluencyScore: number
  successParaphrase: string
  expressionToReuse: string
  errorToWatch: string
  topicId: string
  questionIds: string[]
  wordIds: string[]
  expressionIds: string[]
}

export interface WeeklyTestRecord {
  id: string
  /** Local calendar date of the week's Monday, YYYY-MM-DD. */
  weekKey: string
  date: string
  topicId: string
  durationMinutes: number
  startDelaySeconds: number
  longPauses: number
  majorFillers: number
  successfulParaphrases: number
  abandonedSentences: number
  longestFluentSegmentSeconds: number
}

export interface NativeExpressionExample {
  expressionId: string
  sentences: string[]
  updatedAt: string
}

export interface AppStateV1 {
  version: typeof APP_STATE_VERSION
  sessions: SessionRecord[]
  weeklyTests: WeeklyTestRecord[]
  nativeExpressionExamples: NativeExpressionExample[]
  recentTopicIds: string[]
  recentQuestionIds: string[]
  recentWordIds: string[]
  recentExpressionIds: string[]
  inProgressSession: TrainingSessionState | null
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface LoadAppStateResult {
  state: AppStateV1
  available: boolean
  warning?: string
}

export interface SaveAppStateResult {
  ok: boolean
  warning?: string
}

export const RECENT_WINDOWS = {
  topics: 4,
  questions: 15,
  words: 15,
  expressions: 9,
} as const

export function createInitialState(): AppStateV1 {
  return {
    version: APP_STATE_VERSION,
    sessions: [],
    weeklyTests: [],
    nativeExpressionExamples: [],
    recentTopicIds: [],
    recentQuestionIds: [],
    recentWordIds: [],
    recentExpressionIds: [],
    inProgressSession: null,
  }
}
