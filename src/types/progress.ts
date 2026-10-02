import type { TrainingSessionState } from '../features/training/types'
import type { ProsodyFocus } from '../features/prosody/types'

export const APP_STATE_VERSION = 4 as const
export const STORAGE_KEY = 'parle-plus'
export const LEGACY_STORAGE_KEY = 'fr-fluency-trainer'
export const WEEKLY_GOAL = 5

export interface SessionSummary {
  chunksWorked: number
  gapsPracticed: number
  questionsAsked: number
  fluencyDone: boolean
  /** Chunks of the day actually placed while speaking. */
  chunksUsed?: number
  /** How often the learner blocked on surprise questions. */
  questionBlocks?: { none: number; some: number; much: number }
  retelling?: boolean
}

export interface SessionRecord {
  id: string
  date: string
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

export interface ProsodySessionRecord {
  id: string
  exerciseId: string
  date: string
  completedAt: string
  durationMinutes: number
  focus: ProsodyFocus | null
  retellingSeconds: number
}

export interface WeeklyTestRecord {
  id: string
  weekKey: string
  date: string
  topicId: string
  durationMinutes: number
  startDelaySeconds: number
  longPauses: number
  midSentencePauses?: number
  betweenIdeaPauses?: number
  majorFillers: number
  successfulParaphrases: number
  abandonedSentences: number
  longestFluentSegmentSeconds: number
  wordsSpoken?: number
  score: number
  /** Values measured automatically on the recording, when available. */
  measured?: {
    startDelaySeconds: number
    longPauses: number
    longestSpeechSeconds: number
    speechRatio: number
  }
}

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
  /** Consecutive successful recalls; a failure resets it to 0. */
  streak?: number
  lastResult: 'easy' | 'difficult' | 'failed' | 'discovered' | null
  mastered: boolean
}

export interface PersonalExample {
  chunkId: string
  sentences: string[]
  updatedAt: string
}

export interface PersonalChunk {
  id: string
  intent: string
  expression: string
  createdAt: string
  nextReview: string
}

export type FluencyNoteKind =
  | 'difficultPhrase'
  | 'importantError'
  | 'abandonedSentence'
  | 'awkwardPhrase'
  | 'conversationBlock'

export interface FluencyNote {
  id: string
  kind: FluencyNoteKind
  text: string
  createdAt: string
  nextReview: string
  timesSeen: number
}

export interface ConversationPractice {
  id: string
  weekKey: string
  date: string
  durationMinutes: number
  missingWord: string
  missingWordContext: string
  blockingMoment: string
  expressionToReuse: string
  expressionIntent: string
}

export interface AppState {
  version: typeof APP_STATE_VERSION
  sessions: SessionRecord[]
  prosodySessions: ProsodySessionRecord[]
  weeklyTests: WeeklyTestRecord[]
  conversationPractices: ConversationPractice[]
  wordGaps: WordGap[]
  chunkReviews: ChunkReview[]
  personalExamples: PersonalExample[]
  personalChunks: PersonalChunk[]
  fluencyNotes: FluencyNote[]
  recentTopicIds: string[]
  recentQuestionIds: string[]
  recentWordIds: string[]
  recentChunkIds: string[]
  recentProsodyIds: string[]
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
  prosody: 3,
} as const

export function createInitialState(): AppState {
  return {
    version: APP_STATE_VERSION,
    sessions: [],
    prosodySessions: [],
    weeklyTests: [],
    conversationPractices: [],
    wordGaps: [],
    chunkReviews: [],
    personalExamples: [],
    personalChunks: [],
    fluencyNotes: [],
    recentTopicIds: [],
    recentQuestionIds: [],
    recentWordIds: [],
    recentChunkIds: [],
    recentProsodyIds: [],
    level: 1,
    inProgressSession: null,
  }
}
