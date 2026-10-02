export type ExerciseKind =
  | 'fluency432'
  | 'paraphrase'
  | 'questions'
  | 'natural'

export type ExercisePhase = 'exercise' | 'review' | 'complete'

export interface PersistedSessionContent {
  topicId: string
  wordIds: string[]
  questionIds: string[]
  expressionIds: string[]
}

export interface FluencyState {
  roundIndex: number
  stage: 'running' | 'reflection'
}

export interface ParaphraseState {
  index: number
}

export interface QuestionsState {
  index: number
  stage: 'countdown' | 'speaking'
}

export interface NaturalState {
  index: number
}

export interface SessionReflection {
  missingWord: string
  difficultPhrase: string
  importantError: string
}

export interface ReviewDraft {
  blockCount: number | null
  successParaphrase: string
  expressionToReuse: string
  errorToWatch: string
  fluencyScore: number | null
}

export interface TrainingSessionState {
  sessionId: string
  startedAt: string
  content: PersistedSessionContent
  exerciseIndex: number
  phase: ExercisePhase
  fluency: FluencyState
  paraphrase: ParaphraseState
  questions: QuestionsState
  natural: NaturalState
  examples: Record<string, string[]>
  reflection: SessionReflection
  review: ReviewDraft
}

export const EXERCISE_ORDER: ExerciseKind[] = [
  'fluency432',
  'paraphrase',
  'questions',
  'natural',
]

export const EXERCISE_META: Record<
  ExerciseKind,
  { title: string; shortTitle: string; minutes: number }
> = {
  fluency432: { title: '4 → 3 → 2', shortTitle: '4 → 3 → 2', minutes: 12 },
  paraphrase: { title: 'Mot interdit', shortTitle: 'Paraphrase', minutes: 5 },
  questions: {
    title: 'Questions surprise',
    shortTitle: 'Questions',
    minutes: 8,
  },
  natural: { title: 'Français naturel', shortTitle: 'Naturel', minutes: 5 },
}

// Timings in seconds.
export const FLUENCY_ROUND_SECONDS = [240, 180, 120, 60] as const
export const PARAPHRASE_SECONDS = 60
export const QUESTION_REVEAL_SECONDS = 3
export const QUESTION_SPEAKING_SECONDS = 60
export const NATURAL_EXAMPLES_PER_EXPRESSION = 3

export const PARAPHRASE_RESCUE_STRUCTURES = [
  "C'est quelque chose qui…",
  'Ça sert à…',
  "C'est une sorte de…",
  "C'est quand…",
  "C'est comme…, sauf que…",
] as const

export const QUESTION_STARTERS = [
  'Alors, je dirais que…',
  "Je pense qu'il y a plusieurs raisons…",
  'À mon avis, ça dépend surtout de…',
  "Le principal point, c'est que…",
] as const
