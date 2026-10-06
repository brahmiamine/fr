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
  /** The week's 3/3/3 version. */
  constantTime?: boolean
  /** Questions answered a second time ("répondre → reprendre"). */
  questionRetries?: number
  zappingDone?: boolean
  /** Blocks felt during the taboo monologue. */
  tabooRating?: 'none' | 'some' | 'much'
  mode?: 'full' | 'short' | 'conversation'
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
  /** Subject of 2–7 days before, spoken again in this session. */
  repriseTopicId?: string
  tabooId?: string
  summary: SessionSummary
}

/** A surprise question with a big block, to answer again a few days later. */
export interface QuestionReview {
  questionId: string
  nextReview: string
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
  /** The unknown questions, never asked again in a later test. */
  questionIds?: string[]
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
    shortPauses?: number
    meanPauseSeconds?: number
  }
  /** Known task: 3 minutes on a subject worked during the week. */
  known?: WeeklyTaskMeasure
  /** Unknown task: 3 questions never seen, 90 s each, immediate start. */
  unknown?: WeeklyTaskMeasure
  /** Circumlocution task: words guessed out of `paraphraseAttempts`. */
  paraphraseAttempts?: number
  /** French discourse markers ("disons", "en fait"…) next to bare "euh". */
  markers?: number
  /** Distinct words ÷ 200 on the first 200 words of the unknown task. */
  typeTokenRatio?: number
  /** First test only: the same unknown task in the native language. */
  l1Baseline?: WeeklyTaskMeasure
}

export interface WeeklyTaskMeasure {
  startDelaySeconds: number
  longPauses: number
  meanPauseSeconds: number
  longestSpeechSeconds: number
  /** Words per minute, from a transcription or the learner's count. */
  wordsPerMinute?: number
  /** Bare "euh" per minute (L1 baseline). */
  fillersPerMinute?: number
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
  /** The hardest minute, transcribed, then rewritten with the reformulations. */
  transcribedMinute?: string
  rewrittenMinute?: string
  midClausePauses?: number
  abandonedSentences?: number
  /** Reformulations noted by the partner, one per line. */
  reformulations?: string[]
}

/** "2 à 3 fois par semaine". */
export const CONVERSATIONS_PER_WEEK = { min: 2, max: 3 } as const

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
  questionReviews: QuestionReview[]
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
    questionReviews: [],
    recentTopicIds: [],
    recentQuestionIds: [],
    recentWordIds: [],
    recentChunkIds: [],
    recentProsodyIds: [],
    level: 1,
    inProgressSession: null,
  }
}
