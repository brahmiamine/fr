import type { TimerSnapshot } from '../../hooks/useCountdownTimer'
import questionStartersData from '../../data/question-starters.json'
import rescueStructuresData from '../../data/rescue-structures.json'
import type { Chunk, Question, RetellingStory, TabooTopic, Topic } from '../../types/content'
import type { FluencyNoteKind } from '../../types/progress'

export type StageKind = 'chunks' | 'fluency' | 'reprise' | 'questions' | 'gaps' | 'feedback'

/**
 * Full session (≈ 40 min), short version (≈ 20 min: chunks, 4 → 3 → 2, one
 * question cycle) and conversation day (chunks and 4 → 3 → 2 before a real
 * conversation).
 */
export type SessionMode = 'full' | 'short' | 'conversation'
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
  mode: SessionMode
  /** Stages this session skips (no subject to take up again, short version…). */
  skippedStages: StageKind[]
  topic: Topic
  /** Length of the four rounds: 4/3/2 most days, 3/3/3 once a week. */
  roundSeconds: number[]
  /** The week's constant-time version, which leaves room for accuracy. */
  constantTime: boolean
  /** A subject spoken 2 to 7 days ago, taken up again without preparation. */
  repriseTopic: Topic | null
  chunks: Chunk[]
  chunksOfDay: Chunk[]
  /** Questions answered, then answered again ("répondre → reprendre"). */
  questions: Question[]
  /** Unrelated questions chained in the zapping, 45 s each. */
  zappingQuestions: Question[]
  /** A taboo monologue: describe without the obvious words. */
  taboo: TabooTopic | null
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
export const TRAINING_SESSION_SCHEMA = 4

export type QuestionStage = 'countdown' | 'prep' | 'speaking' | 'rate' | 'note' | 'retry'

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

  reprise: {
    stage: 'intro' | 'running'
  }

  questions: {
    index: number
    /** Answer, rate the blocks, note what was missing, then answer again. */
    stage: QuestionStage
  }
  questionRatings: QuestionRating[]
  /** What was missing in each first answer, shown during its second one. */
  questionNotes: Record<string, string>
  zapping: {
    stage: 'intro' | 'running' | 'done'
    index: number
  }

  taboo: {
    stage: 'intro' | 'running' | 'rate' | 'done'
    rating: BlockRating | null
  }
  /** The word gaps are over: the taboo monologue is on screen. */
  tabooStarted?: boolean
  /** The subject of 2–7 days ago was really spoken again. */
  repriseDone?: boolean
  /** Questions answered a second time. */
  questionRetries?: number

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
  'reprise',
  'questions',
  'gaps',
  'feedback',
]

export const STAGE_META: Record<StageKind, { title: string; minutes: number }> = {
  chunks: { title: 'Chunks + récupération', minutes: 5 },
  fluency: { title: '4 → 3 → 2 + transfert', minutes: 15 },
  reprise: { title: 'Reprise d’un sujet', minutes: 3 },
  questions: { title: 'Questions surprises', minutes: 10 },
  gaps: { title: 'Trous de mots + tabou', minutes: 5 },
  feedback: { title: 'Feedback', minutes: 2 },
}

/** Stages kept by each kind of session. */
export const MODE_STAGES: Record<SessionMode, StageKind[]> = {
  full: STAGE_ORDER,
  short: ['chunks', 'fluency', 'questions', 'feedback'],
  conversation: ['chunks', 'fluency', 'feedback'],
}

export const MODE_LABELS: Record<SessionMode, string> = {
  full: 'Séance complète',
  short: 'Version courte',
  conversation: 'Jour de conversation',
}

/** 4 / 3 / 2 minutes, then a 2-minute transfer on a different question. */
export const FLUENCY_ROUND_SECONDS = [240, 180, 120, 120] as const
/** Once a week: constant time (3 / 3 / 3), which costs less accuracy. */
export const CONSTANT_ROUND_SECONDS = [180, 180, 180, 120] as const
export const REPRISE_SECONDS = 180
/** A subject comes back between J+2 and J+7. */
export const REPRISE_MIN_DAYS = 2
export const REPRISE_MAX_DAYS = 7
export const MAX_KEYWORDS = 5
/** Indicative preparation of round 1: keywords only, never sentences. */
export const FLUENCY_PREP_SECONDS = 60
/** Time to read the prompt of rounds 2–4 before the timer and the recording start. */
export const FLUENCY_READ_SECONDS = 10
export const CHUNKS_PER_SESSION = 4
/** Two "answer → answer again" cycles, then the zapping. */
export const QUESTIONS_PER_SESSION = 2
export const ZAPPING_QUESTIONS = 4
export const ZAPPING_SECONDS = 45
export const GAPS_PER_SESSION = 4
export const QUESTION_COUNTDOWN_SECONDS = 3
export const QUESTION_SPEAKING_SECONDS = 60
/** Second answer to the same question. */
export const QUESTION_RETRY_SECONDS = 60
/** Note what was missing before answering again. */
export const QUESTION_NOTE_SECONDS = 30
/** A question with a big block comes back 3 days later (J+3 to J+7). */
export const QUESTION_REVIEW_DAYS = 3
export const GAP_PARAPHRASE_SECONDS = 15
/** "Essaie de retrouver le mot rapidement. S'il ne vient pas, tu n'attends pas." */
export const GAP_RECALL_SECONDS = 5
export const TABOO_SECONDS = 90
/** Indicative length of the delayed feedback between rounds 1 and 2. */
export const MINI_FEEDBACK_SECONDS = 120

/** Spoken transitions of the zapping, one before each new question. */
export const ZAPPING_TRANSITIONS = [
  'Rien à voir, mais…',
  'Pour passer à autre chose…',
  'Ça me fait penser à un tout autre sujet…',
  'Bon, autre chose…',
]

/** The automatic structure of an answer, decided during the preparation. */
export const ANSWER_STRUCTURE = 'Position → raison → exemple → nuance → conclusion'

/**
 * One prosodic cue per round ("une seule, jamais plus"): round 1 is about the
 * content, then the learner's recent prosody point, then generic cues.
 */
export const PROSODY_ROUND_CUES = [
  'Monte la voix avant chaque « et », « mais », « parce que ».',
  'Ne coupe jamais un groupe au milieu : pause seulement entre deux idées.',
  'Allonge la dernière syllabe de chaque groupe.',
]

export function prosodyCueForRound(roundIndex: number, focusGoal: string | null): string | null {
  if (roundIndex <= 0) return null
  if (roundIndex === 1) return focusGoal ?? PROSODY_ROUND_CUES[0]
  return PROSODY_ROUND_CUES[(roundIndex - 1) % PROSODY_ROUND_CUES.length] ?? null
}

/** Round labels, e.g. "Tour 1 — 4:00", "Transfert — 2:00". */
export function roundLabels(roundSeconds: readonly number[]): string[] {
  return roundSeconds.map((seconds, index) => {
    const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
    return index === roundSeconds.length - 1 ? `Transfert — ${time}` : `Tour ${index + 1} — ${time}`
  })
}

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

/**
 * The 8 to 10 formulas to automate first ("plutôt que 40 formules qu'on
 * oublie"); the full list stays available as a reserve.
 */
export const RESCUE_CORE: readonly string[] = [
  "C'est une sorte de…",
  "C'est le truc qui sert à…",
  "C'est un peu comme… mais en plus…",
  "C'est le contraire de…",
  "C'est ce qu'on fait quand…",
  "C'est un endroit où…",
  "C'est une personne qui…",
  "En gros, c'est…",
  "Je ne sais plus comment ça s'appelle, mais…",
]

export const QUESTION_STARTERS = questionStartersData as readonly string[]
