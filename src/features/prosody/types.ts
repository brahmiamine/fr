export type ProsodyStage = 'listening' | 'imitation' | 'comparison' | 'retelling'

export type ProsodyFocus =
  | 'pause'
  | 'grouping'
  | 'rhythm'
  | 'intonation'
  | 'finalLengthening'
  | 'continuity'
  | 'tempo'
  | 'energy'

export type ProsodyModelKind = 'recording' | 'tts'
export type ProsodySpeed = 'slow' | 'normal' | 'fast'

export interface ProsodyGroup {
  text: string
  start: number
  end: number
  intonation: 'level' | 'rise' | 'fall'
  /** Measured on the pitch curve of the recording: only these are scored. */
  intonationMeasured?: boolean
  /** Silence measured after the group, in seconds (acoustic annotation). */
  pauseAfter?: number
  /** Measured [start, end] of each word of `text`, in seconds. */
  words?: Array<[number, number]>
  finalLengthening?: boolean
  liaisonAfter?: boolean
  enchainementAfter?: boolean
}

export interface ProsodyExercise {
  id: string
  level: string
  category: string
  modelKind?: ProsodyModelKind
  audio?: string
  transcript: string
  groups: ProsodyGroup[]
  imitation: { start: number; end: number }
  retelling: { idea: string }
  /** True when the model is usable: licensed recording or browser TTS fallback. */
  ready: boolean
  source: string
  /** Canonical page where the reusable recording and its license can be verified. */
  sourceUrl?: string
  /** SPDX-like short identifier used by the bundled recording bank. */
  license?: 'CC0-1.0' | 'CC-BY-3.0' | 'CC-BY-SA-3.0' | 'CC-BY-SA-4.0'
  /** Human-readable credit and modification notice for bundled recordings. */
  attribution?: string
  /** Range selected from the original source, before it was normalized for the app. */
  sourceRange?: { start: number; end: number }
  voiceLocale?: string
  register?: 'familier' | 'courant' | 'soutenu'
  speed?: ProsodySpeed
  focus?: ProsodyFocus[]
  /** `estimated` for TTS (syllable-based), `measured` for real recordings. */
  timing?: 'estimated' | 'measured'
  /** Learner-imported excerpt: groups are only a rough guide, not a reference. */
  custom?: boolean
  /**
   * `acoustic`: groups end on pauses measured in the audio and intonations
   * come from the pitch curve (scripts/prosody_audio). Without it, a
   * recording's groups were guessed from punctuation and are not scored.
   */
  annotation?: 'acoustic'
  /**
   * Measured melody: every `step` seconds, the pitch in semitones from the
   * speaker's median, or null where the voice is silent or unvoiced.
   */
  pitch?: { step: number; semitones: Array<number | null> }
}

export const REQUIRED_MEANING_LISTENS = 1
export const REQUIRED_PROSODY_LISTENS = 1
export const REQUIRED_IMITATION_LISTENS = 2
export const REQUIRED_SHADOW_PLAYS = 1
export const MIN_FULL_AUDIO_SECONDS = 10
export const MAX_FULL_AUDIO_SECONDS = 30
export const MIN_IMITATION_SECONDS = 5
export const MAX_IMITATION_SECONDS = 15
export const MIN_RETELL_SECONDS = 30
export const TARGET_RETELL_SECONDS = 60

export interface RetellingGoal {
  minSeconds: number
  targetSeconds: number
}

/** Start with 30–60 s, then progressively move towards 1–2 minutes. */
export function retellingGoalFor(completedProsodySessions: number): RetellingGoal {
  if (completedProsodySessions < 5) return { minSeconds: 30, targetSeconds: 60 }
  if (completedProsodySessions < 10) return { minSeconds: 45, targetSeconds: 90 }
  return { minSeconds: 60, targetSeconds: 120 }
}

/**
 * "Il vaut mieux très bien reproduire une phrase que mal reproduire 60 secondes":
 * the imitation segment starts with one short phrase and grows with practice.
 */
export function maxImitationSecondsFor(completedProsodySessions: number): number {
  if (completedProsodySessions < 5) return 8
  if (completedProsodySessions < 10) return 11
  return MAX_IMITATION_SECONDS
}

/**
 * Shortens the imitation segment to the learner's stage, always ending on the
 * end of a rhythmic group so the phrase is never cut in the middle.
 */
export function withImitationForLevel(
  exercise: ProsodyExercise,
  completedProsodySessions: number,
): ProsodyExercise {
  const { start, end } = exercise.imitation
  const max = maxImitationSecondsFor(completedProsodySessions)
  if (exercise.custom || end - start <= max) return exercise
  const ends = exercise.groups
    .filter((group) => group.start >= start - 0.01 && group.end <= end + 0.01)
    .map((group) => group.end)
    .filter((groupEnd) => groupEnd - start >= MIN_IMITATION_SECONDS)
  const fitting = ends.filter((groupEnd) => groupEnd - start <= max)
  const chosen = fitting.length > 0 ? Math.max(...fitting) : Math.min(...ends)
  if (!Number.isFinite(chosen) || chosen >= end) return exercise
  return { ...exercise, imitation: { start, end: chosen } }
}

export interface ProsodySessionState {
  id: string
  exerciseId: string
  startedAt: string
  stage: ProsodyStage
  completed: boolean

  listening: {
    step: 'meaning' | 'prosody' | 'mark' | 'reveal'
    meaningPlays: number
    prosodyPlays: number
    marking: { boundaries: number[]; intonations: Array<ProsodyGroup['intonation']> } | null
  }
  imitation: {
    step: 'listen' | 'record' | 'shadow'
    modelPlays: number
    shadowPlays: number
  }
  comparison: {
    step: 'aba' | 'choose-focus' | 'retry' | 'compare-attempts'
    focus: ProsodyFocus | null
    abaCompleted: boolean
  }
  retelling: {
    step: 'prompt' | 'record' | 'review'
    durationSeconds: number
    minSeconds: number
    targetSeconds: number
  }
}

export const STAGE_ORDER: ProsodyStage[] = [
  'listening',
  'imitation',
  'comparison',
  'retelling',
]

export const STAGE_LABELS: Record<ProsodyStage, string> = {
  listening: 'Écoute',
  imitation: 'Imitation',
  comparison: 'Comparaison',
  retelling: 'Retelling',
}

export interface FocusOption {
  value: ProsodyFocus
  label: string
  goal: string
}

export const FOCUS_OPTIONS: FocusOption[] = [
  { value: 'pause', label: 'Je coupe au mauvais endroit', goal: 'Ne coupe pas le groupe au mauvais endroit.' },
  { value: 'grouping', label: 'Mes groupes sont différents', goal: 'Regroupe les mots comme le locuteur.' },
  { value: 'rhythm', label: 'Mon rythme est trop haché', goal: 'Lisse le rythme : enchaîne les syllabes.' },
  { value: 'intonation', label: "Mon intonation est différente du modèle", goal: 'Reproduis le mouvement de voix du modèle.' },
  { value: 'finalLengthening', label: 'Ma fin de groupe est trop courte', goal: 'Allonge la dernière syllabe du groupe.' },
  { value: 'continuity', label: "Je n'enchaîne pas assez", goal: "Enchaîne d'un groupe à l'autre sans t'arrêter." },
  { value: 'tempo', label: 'Je parle trop vite ou trop lentement', goal: 'Rapproche ta durée et ta vitesse de celles du modèle.' },
  { value: 'energy', label: "Mon énergie est différente", goal: "Copie aussi l'énergie et l'intensité du locuteur." },
]

function intonationMark(value: ProsodyGroup['intonation']): string {
  if (value === 'rise') return '↑'
  if (value === 'fall') return '↓'
  return '→'
}

/**
 * Whether a group's intonation can be trusted as a reference:
 * - a recording annotated from the audio: only movements measured on its pitch curve;
 * - the synthetic voice: only group ends on punctuation, where it does move its voice;
 * - a recording annotated from punctuation alone: never, it was a guess.
 */
export function hasReliableIntonation(
  exercise: Pick<ProsodyExercise, 'annotation' | 'modelKind'>,
  group: ProsodyGroup,
): boolean {
  if (exercise.annotation === 'acoustic') return group.intonationMeasured === true
  if (exercise.modelKind === 'tts') return /[,;:.!?…]["»)]*$/.test(group.text)
  return false
}

export function intonationPattern(exercise: ProsodyExercise): string {
  return exercise.groups
    .map((group) => (hasReliableIntonation(exercise, group) ? intonationMark(group.intonation) : '·'))
    .join(' ')
}

export function focusGoal(
  focus: ProsodyFocus | null,
  exercise?: ProsodyExercise,
): string {
  if (focus === 'intonation' && exercise) {
    return `Reproduis le mouvement de voix du modèle : ${intonationPattern(exercise)}.`
  }
  return FOCUS_OPTIONS.find((option) => option.value === focus)?.goal ?? ''
}

export function imitationTranscript(exercise: ProsodyExercise): string {
  return exercise.groups
    .filter(
      (group) =>
        group.end > exercise.imitation.start &&
        group.start < exercise.imitation.end,
    )
    .map((group) => group.text)
    .join(' ')
}

export function speechRateFor(exercise: ProsodyExercise): number {
  if (exercise.speed === 'slow') return 0.82
  if (exercise.speed === 'fast') return 1.08
  return 0.95
}
