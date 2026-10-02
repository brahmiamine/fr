import type { ProsodyExercise, ProsodyFocus, ProsodySessionState } from './types'

export type ProsodyAction =
  | { type: 'LISTEN_NEXT' }
  | { type: 'IMITATION_LISTENED' }
  | { type: 'IMITATION_RECORDED' }
  | { type: 'SHADOW_DONE' }
  | { type: 'COMPARISON_DONE' }
  | { type: 'CHOOSE_FOCUS'; focus: ProsodyFocus }
  | { type: 'RETRY_DONE' }
  | { type: 'COMPARE_DONE' }
  | { type: 'RETELL_START' }
  | { type: 'RETELL_RECORDED' }
  | { type: 'RETELL_DONE' }

export function createProsodySession(
  exercise: ProsodyExercise,
  now: Date = new Date(),
): ProsodySessionState {
  return {
    id: `p-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    exerciseId: exercise.id,
    startedAt: now.toISOString(),
    stage: 'listening',
    completed: false,
    listening: { step: 'meaning' },
    imitation: { step: 'listen' },
    comparison: { step: 'aba', focus: null },
    retelling: { step: 'prompt' },
  }
}

export function prosodyReducer(
  state: ProsodySessionState,
  action: ProsodyAction,
): ProsodySessionState {
  switch (action.type) {
    case 'LISTEN_NEXT': {
      if (state.stage !== 'listening') return state
      const step = state.listening.step
      if (step === 'meaning') return { ...state, listening: { step: 'prosody' } }
      if (step === 'prosody') return { ...state, listening: { step: 'reveal' } }
      return { ...state, stage: 'imitation', imitation: { step: 'listen' } }
    }

    case 'IMITATION_LISTENED':
      if (state.stage !== 'imitation') return state
      return { ...state, imitation: { step: 'record' } }

    case 'IMITATION_RECORDED':
      if (state.stage !== 'imitation') return state
      return { ...state, imitation: { step: 'shadow' } }

    case 'SHADOW_DONE':
      if (state.stage !== 'imitation') return state
      return {
        ...state,
        stage: 'comparison',
        comparison: { step: 'aba', focus: null },
      }

    case 'COMPARISON_DONE':
      if (state.stage !== 'comparison' || state.comparison.step !== 'aba') return state
      return { ...state, comparison: { ...state.comparison, step: 'choose-focus' } }

    case 'CHOOSE_FOCUS':
      if (state.stage !== 'comparison' || state.comparison.step !== 'choose-focus') {
        return state
      }
      return { ...state, comparison: { step: 'retry', focus: action.focus } }

    case 'RETRY_DONE':
      if (state.stage !== 'comparison' || state.comparison.step !== 'retry') return state
      return { ...state, comparison: { ...state.comparison, step: 'compare-attempts' } }

    case 'COMPARE_DONE':
      if (state.stage !== 'comparison' || state.comparison.step !== 'compare-attempts') {
        return state
      }
      return { ...state, stage: 'retelling', retelling: { step: 'prompt' } }

    case 'RETELL_START':
      if (state.stage !== 'retelling') return state
      return { ...state, retelling: { step: 'record' } }

    case 'RETELL_RECORDED':
      if (state.stage !== 'retelling') return state
      return { ...state, retelling: { step: 'review' } }

    case 'RETELL_DONE':
      if (state.stage !== 'retelling') return state
      return { ...state, completed: true }

    default:
      return state
  }
}
