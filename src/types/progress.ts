import type { TrainingSessionState } from '../features/training/types'

export const APP_STATE_VERSION = 2 as const
export const STORAGE_KEY = 'fr-fluency-trainer'
export const WEEKLY_GOAL = 5

export interface SessionSummary {
  chunksWorked: number
  gapsPracticed: number
  questionsAsked: number
  fluencyDone: boolean
}

export interface SessionRecord {
  id: string
  /** Local calendar date, YYYY-MM-DD. */
  date: string
  /** ISO timestamp of completion. */
  completedAt: string
  durationMinutes: number
  blockCount: number
  fluencyScore: number
  blockedWord: string
  expressionToReuse: string
  topicId: string
  questionIds: string[]
  chunkIds: string[]
  genericWordIds: string[]
  summary: SessionSummary
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
  score: number
}

/** A word the learner personally got stuck on. */
export interface WordGap {
  id: string
  target: string
  context: string
  createdAt: string
  successCount: number
  nextReview: string
  status: 'learning' | 'mastered'
}

export interface ChunkReview {
  chunkId: string
  nextReview: string
  interval: number
  timesSeen: number
  timesRecalled: number
  lastResult: 'easy' | 'difficult' | 'failed' | null
  mastered: boolean
}

export interface PersonalExample {
  chunkId: string
  sentences: string[]
  updatedAt: string
}

export interface AppState {
  version: typeof APP_STATE_VERSION
  sessions: SessionRecord[]
  weeklyTests: WeeklyTestRecord[]
  wordGaps: WordGap[]
  chunkReviews: ChunkReview[]
  personalExamples: PersonalExample[]
  recentTopicIds: string[]
  recentQuestionIds: string[]
  recentWordIds: string[]
  recentChunkIds: string[]
  level: 1 | 2 | 3
  inProgressSession: TrainingSessionState | null
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface LoadAppStateResult {
  state: AppState
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
  chunks: 9,
} as const

export function createInitialState(): AppState {
  return {
    version: APP_STATE_VERSION,
    sessions: [],
    weeklyTests: [],
    wordGaps: [],
    chunkReviews: [],
    personalExamples: [],
    recentTopicIds: [],
    recentQuestionIds: [],
    recentWordIds: [],
    recentChunkIds: [],
    level: 2,
    inProgressSession: null,
  }
}
