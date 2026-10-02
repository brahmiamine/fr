import questionStartersData from '../../data/question-starters.json'
import rescueStructuresData from '../../data/rescue-structures.json'
import type { Chunk, Question, Topic } from '../../types/content'
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
}

export type RecallResult = 'easy' | 'difficult' | 'failed'
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

export interface TrainingSessionState {
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
  usedFluencyReminderIds: string[]

  fluency: {
    roundIndex: number
    stage: 'prep' | 'running' | 'feedback'
    keywords: string[]
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
    step: 'recall' | 'paraphrase' | 'revealed'
  }
  gapResults: GapResult[]

  feedback: SessionFeedback
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
export const CHUNKS_PER_SESSION = 3
export const QUESTIONS_PER_SESSION = 5
export const GAPS_PER_SESSION = 5
export const QUESTION_COUNTDOWN_SECONDS = 3
export const QUESTION_SPEAKING_SECONDS = 60
export const GAP_PARAPHRASE_SECONDS = 15

export function prepSecondsForLevel(level: 1 | 2 | 3): number {
  if (level === 1) return 10
  if (level === 2) return 5
  return 3
}

export const RESCUE_STRUCTURES = rescueStructuresData as readonly string[]

export const QUESTION_STARTERS = questionStartersData as readonly string[]
