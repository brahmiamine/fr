import type { ProsodyExercise, ProsodyFocus, ProsodySessionState } from './types'
import {
  MIN_RETELL_SECONDS,
  REQUIRED_IMITATION_LISTENS,
  REQUIRED_MEANING_LISTENS,
  REQUIRED_PROSODY_LISTENS,
  REQUIRED_SHADOW_PLAYS,
} from './types'

export type ProsodyAction =
  | { type: 'LISTEN_PLAYED' }
  | { type: 'LISTEN_NEXT' }
  | { type: 'IMITATION_MODEL_PLAYED' }
  | { type: 'IMITATION_LISTENED' }
  | { type: 'IMITATION_RECORDED' }
  | { type: 'SHADOW_PLAYED' }
  | { type: 'SHADOW_DONE' }
  | { type: 'ABA_COMPLETE' }
  | { type: 'COMPARISON_DONE' }
  | { type: 'CHOOSE_FOCUS'; focus: ProsodyFocus }
  | { type: 'RETRY_DONE' }
  | { type: 'COMPARE_DONE' }
  | { type: 'RETELL_START' }
  | { type: 'RETELL_RECORDED'; durationSeconds: number }
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
    listening: { step: 'meaning', meaningPlays: 0, prosodyPlays: 0 },
    imitation: { step: 'listen', modelPlays: 0, shadowPlays: 0 },
    comparison: { step: 'aba', focus: null, abaCompleted: false },
    retelling: { step: 'prompt', durationSeconds: 0 },
  }
}

export function prosodyReducer(
  state: ProsodySessionState,
  action: ProsodyAction,
): ProsodySessionState {
  switch (action.type) {
    case 'LISTEN_PLAYED': {
      if (state.stage !== 'listening') return state
      if (state.listening.step === 'meaning') {
        return {
          ...state,
          listening: {
            ...state.listening,
            meaningPlays: state.listening.meaningPlays + 1,
          },
        }
      }
      if (state.listening.step === 'prosody') {
        return {
          ...state,
          listening: {
            ...state.listening,
            prosodyPlays: state.listening.prosodyPlays + 1,
          },
        }
      }
      return state
    }

    case 'LISTEN_NEXT': {
      if (state.stage !== 'listening') return state
      const step = state.listening.step
      if (
        step === 'meaning' &&
        state.listening.meaningPlays >= REQUIRED_MEANING_LISTENS
      ) {
        return { ...state, listening: { ...state.listening, step: 'prosody' } }
      }
      if (
        step === 'prosody' &&
        state.listening.prosodyPlays >= REQUIRED_PROSODY_LISTENS
      ) {
        return { ...state, listening: { ...state.listening, step: 'reveal' } }
      }
      if (step === 'reveal') {
        return { ...state, stage: 'imitation', imitation: { ...state.imitation, step: 'listen' } }
      }
      return state
    }

    case 'IMITATION_MODEL_PLAYED':
      if (state.stage !== 'imitation' || state.imitation.step !== 'listen') return state
      return {
        ...state,
        imitation: {
          ...state.imitation,
          modelPlays: state.imitation.modelPlays + 1,
        },
      }

    case 'IMITATION_LISTENED':
      if (
        state.stage !== 'imitation' ||
        state.imitation.step !== 'listen' ||
        state.imitation.modelPlays < REQUIRED_IMITATION_LISTENS
      ) {
        return state
      }
      return { ...state, imitation: { ...state.imitation, step: 'record' } }

    case 'IMITATION_RECORDED':
      if (state.stage !== 'imitation' || state.imitation.step !== 'record') return state
      return { ...state, imitation: { ...state.imitation, step: 'shadow' } }

    case 'SHADOW_PLAYED':
      if (state.stage !== 'imitation' || state.imitation.step !== 'shadow') return state
      return {
        ...state,
        imitation: {
          ...state.imitation,
          shadowPlays: state.imitation.shadowPlays + 1,
        },
      }

    case 'SHADOW_DONE':
      if (
        state.stage !== 'imitation' ||
        state.imitation.step !== 'shadow' ||
        state.imitation.shadowPlays < REQUIRED_SHADOW_PLAYS
      ) {
        return state
      }
      return {
        ...state,
        stage: 'comparison',
        comparison: { step: 'aba', focus: null, abaCompleted: false },
      }

    case 'ABA_COMPLETE':
      if (state.stage !== 'comparison' || state.comparison.step !== 'aba') return state
      return {
        ...state,
        comparison: { ...state.comparison, abaCompleted: true },
      }

    case 'COMPARISON_DONE':
      if (
        state.stage !== 'comparison' ||
        state.comparison.step !== 'aba' ||
        !state.comparison.abaCompleted
      ) {
        return state
      }
      return {
        ...state,
        comparison: { ...state.comparison, step: 'choose-focus' },
      }

    case 'CHOOSE_FOCUS':
      if (state.stage !== 'comparison' || state.comparison.step !== 'choose-focus') {
        return state
      }
      return {
        ...state,
        comparison: { ...state.comparison, step: 'retry', focus: action.focus },
      }

    case 'RETRY_DONE':
      if (state.stage !== 'comparison' || state.comparison.step !== 'retry') return state
      return {
        ...state,
        comparison: { ...state.comparison, step: 'compare-attempts' },
      }

    case 'COMPARE_DONE':
      if (state.stage !== 'comparison' || state.comparison.step !== 'compare-attempts') {
        return state
      }
      return { ...state, stage: 'retelling', retelling: { step: 'prompt', durationSeconds: 0 } }

    case 'RETELL_START':
      if (state.stage !== 'retelling' || state.retelling.step !== 'prompt') return state
      return { ...state, retelling: { ...state.retelling, step: 'record' } }

    case 'RETELL_RECORDED':
      if (
        state.stage !== 'retelling' ||
        state.retelling.step !== 'record' ||
        action.durationSeconds < MIN_RETELL_SECONDS
      ) {
        return state
      }
      return {
        ...state,
        retelling: {
          step: 'review',
          durationSeconds: action.durationSeconds,
        },
      }

    case 'RETELL_DONE':
      if (state.stage !== 'retelling' || state.retelling.step !== 'review') return state
      return { ...state, completed: true }

    default:
      return state
  }
}
