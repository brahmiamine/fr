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

export interface ProsodyGroup {
  text: string
  start: number
  end: number
  intonation: 'level' | 'rise' | 'fall'
  finalLengthening?: boolean
}

export interface ProsodyExercise {
  id: string
  level: string
  category: string
  audio: string
  transcript: string
  groups: ProsodyGroup[]
  imitation: { start: number; end: number }
  retelling: { idea: string }
  /** True only when the file contains a real, licensed/natively recorded model. */
  ready: boolean
  source?: string
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

export interface ProsodySessionState {
  id: string
  exerciseId: string
  startedAt: string
  stage: ProsodyStage
  completed: boolean

  listening: {
    step: 'meaning' | 'prosody' | 'reveal'
    meaningPlays: number
    prosodyPlays: number
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
  {
    value: 'pause',
    label: 'Je coupe au mauvais endroit',
    goal: 'Ne coupe pas le groupe au mauvais endroit.',
  },
  {
    value: 'grouping',
    label: 'Mes groupes sont différents',
    goal: 'Regroupe les mots comme le locuteur.',
  },
  {
    value: 'rhythm',
    label: 'Mon rythme est trop haché',
    goal: 'Lisse le rythme : enchaîne les syllabes.',
  },
  {
    value: 'intonation',
    label: "Mon intonation est différente du modèle",
    goal: 'Reproduis le mouvement de voix du modèle.',
  },
  {
    value: 'finalLengthening',
    label: 'Ma fin de groupe est trop courte',
    goal: 'Allonge la dernière syllabe du groupe.',
  },
  {
    value: 'continuity',
    label: "Je n'enchaîne pas assez",
    goal: "Enchaîne d'un groupe à l'autre sans t'arrêter.",
  },
  {
    value: 'tempo',
    label: 'Je parle trop vite ou trop lentement',
    goal: 'Rapproche ta durée et ta vitesse de celles du modèle.',
  },
  {
    value: 'energy',
    label: "Mon énergie est différente",
    goal: "Copie aussi l'énergie et l'intensité du locuteur.",
  },
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
