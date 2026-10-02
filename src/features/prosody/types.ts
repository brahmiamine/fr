export type ProsodyStage = 'listening' | 'imitation' | 'comparison' | 'retelling'

export type ProsodyFocus =
  | 'pause'
  | 'grouping'
  | 'rhythm'
  | 'intonation'
  | 'finalLengthening'
  | 'continuity'

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
}

export interface ProsodySessionState {
  id: string
  exerciseId: string
  startedAt: string
  stage: ProsodyStage
  completed: boolean

  listening: { step: 'meaning' | 'prosody' | 'reveal' }
  imitation: { step: 'listen' | 'record' | 'shadow' }
  comparison: {
    step: 'aba' | 'choose-focus' | 'retry' | 'compare-attempts'
    focus: ProsodyFocus | null
  }
  retelling: { step: 'prompt' | 'record' | 'review' }
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
  /** What the learner hears as the difference. */
  label: string
  /** The single positive correction goal to reuse (not the raw error). */
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
    label: 'Ma voix reste trop plate',
    goal: 'Fais bouger la voix : monte puis descends.',
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
]

export function focusGoal(focus: ProsodyFocus | null): string {
  return FOCUS_OPTIONS.find((option) => option.value === focus)?.goal ?? ''
}
