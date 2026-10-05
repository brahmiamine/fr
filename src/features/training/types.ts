import type { TimerSnapshot } from '../../hooks/useCountdownTimer'
import questionStartersData from '../../data/question-starters.json'
import rescueStructuresData from '../../data/rescue-structures.json'
import type { Chunk, Question, RetellingStory, Topic } from '../../types/content'
import type { FluencyNoteKind } from '../../types/progress'

export type StageKind = 'chunks' | 'fluency' | 'questions' | 'gaps' | 'feedback'
export type Phase = 'active' | 'complete'

export interface GapItem {
  key: string
  kind: 'retrieve' | 'paraphrase'
  target: string
  context: string
  isPersonal: boolean
  sourceId: string | null
  rescueAngles?: string[]
}

export interface FluencyReminder {
  id: string
  kind: FluencyNoteKind
  text: string
}

export interface SessionPlan {
  topic: Topic
  chunks: Chunk[]
  chunksOfDay: Chunk[]
  questions: Question[]
  pivotQuestion: Question | null
  gapItems: GapItem[]
  focusWords: string[]
  fluencyReminders: FluencyReminder[]
  /** Chunks the learner has never met: discovered rather than retrieved. */
  newChunkIds: string[]
  /** "Certains jours", the 4 → 3 → 2 retells a short story instead. */
  retellingStory: RetellingStory | null
  /** Recent prosody point to keep while speaking (convergence of both blocks). */
  prosodyFocusGoal: string | null
}

/** `discovered`: first encounter, the chunk was learned rather than retrieved. */
export type RecallResult = 'easy' | 'difficult' | 'failed' | 'discovered'
export type BlockRating = 'none' | 'some' | 'much'

export interface ChunkResult {
  chunkId: string
  result: RecallResult
}

export interface QuestionRating {
  questionId: string
  rating: BlockRating
}

export interface GapResult {
  itemKey: string
  found: boolean
}

export interface FluencyFeedback {
  missingWord: string
  missingWordContext: string
  difficultPhrase: string
  importantError: string
  /** A chunk the learner could have used, to place in the next rounds. */
  missedChunk?: string
  missedChunkIntent?: string
}

/** A generic word the learner wants to keep in their personal gap list. */
export interface GapCapture {
  target: string
  context: string
}

export interface SessionFeedback {
  blockedWord: string
  blockedWordContext: string
  abandonedSentence: string
  awkwardPhrase: string
  expressionToReuse: string
  expressionIntent: string
  blockCount: number | null
  fluencyScore: number | null
}

/** Bump when the in-progress session shape changes: older ones restart. */
export const TRAINING_SESSION_SCHEMA = 3

export interface TrainingSessionState {
  schema?: number
  sessionId: string
  startedAt: string
  level: 1 | 2 | 3
  stageIndex: number
  phase: Phase
  plan: SessionPlan

  chunks: {
    index: number
    step: 'retrieve' | 'revealed' | 'day'
  }
  chunkResults: ChunkResult[]
  chunksOfDayShown: boolean
  /** Chunks of the day the learner confirms having placed while speaking. */
  usedChunkIds: string[]
  usedFluencyReminderIds: string[]

  fluency: {
    roundIndex: number
    stage: 'prep' | 'ready' | 'running' | 'feedback' | 'summary'
    keywords: string[]
    /** Record every round through the microphone to replay them at the end. */
    recordAll: boolean
    /** Transfer subject written by the AI for this session (replaces the topic's static one). */
    transferPrompt?: string
  }
  fluencyFeedback: FluencyFeedback

  questions: {
    index: number
    stage: 'countdown' | 'prep' | 'speaking' | 'rate'
  }
  questionRatings: QuestionRating[]
  revenge: {
    questionId: string | null
    stage: 'idle' | 'countdown' | 'prep' | 'speaking' | 'done'
  }

  gaps: {
    index: number
    step: 'recall' | 'verify' | 'paraphrase' | 'revealed'
  }
  gapResults: GapResult[]
  gapCaptures: GapCapture[]

  feedback: SessionFeedback

  /** Running/paused timers by key, so a reload resumes them instead of restarting. */
  timers?: Record<string, TimerSnapshot>
}

export const STAGE_ORDER: StageKind[] = [
  'chunks',
  'fluency',
  'questions',
  'gaps',
  'feedback',
]

export const STAGE_META: Record<StageKind, { title: string; minutes: number }> = {
  chunks: { title: 'Chunks + récupération', minutes: 6 },
  fluency: { title: '4 → 3 → 2 + transfert', minutes: 13 },
  questions: { title: 'Questions surprises', minutes: 9 },
  gaps: { title: 'Mes trous de mots', minutes: 5 },
  feedback: { title: 'Feedback', minutes: 2 },
}

export const FLUENCY_ROUND_SECONDS = [240, 180, 120, 60] as const
/** Time to read the prompt of rounds 2–4 before the timer and the recording start. */
export const FLUENCY_READ_SECONDS = 10
export const CHUNKS_PER_SESSION = 4
export const QUESTIONS_PER_SESSION = 5
export const GAPS_PER_SESSION = 5
export const QUESTION_COUNTDOWN_SECONDS = 3
export const QUESTION_SPEAKING_SECONDS = 60
export const GAP_PARAPHRASE_SECONDS = 15
/** "Essaie de retrouver le mot rapidement. S'il ne vient pas, tu n'attends pas." */
export const GAP_RECALL_SECONDS = 5
/** Indicative length of the mini-feedback between rounds 1 and 2. */
export const MINI_FEEDBACK_SECONDS = 60

/** Speaking time grows from 60 s to 90 s as the learner progresses. */
export function speakingSecondsForLevel(level: 1 | 2 | 3): number {
  if (level === 1) return 60
  if (level === 2) return 75
  return 90
}

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  personal: 'personnelle',
  opinion: 'opinion',
  argumentation: 'argumentation',
  narrative: 'récit',
  hypothetical: 'hypothèse',
  comparison: 'comparaison',
  'problem-solving': 'résolution de problème',
  abstract: 'abstraite',
}
export function prepSecondsForLevel(level: 1 | 2 | 3): number {
  if (level === 1) return 10
  if (level === 2) return 5
  return 3
}

export const RESCUE_STRUCTURES = rescueStructuresData as readonly string[]

export const QUESTION_STARTERS = questionStartersData as readonly string[]
