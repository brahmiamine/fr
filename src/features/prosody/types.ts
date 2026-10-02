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
  license?: 'CC0-1.0' | 'CC-BY-SA-3.0' | 'CC-BY-SA-4.0'
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

export function intonationPattern(exercise: ProsodyExercise): string {
  return exercise.groups.map((group) => intonationMark(group.intonation)).join(' ')
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
