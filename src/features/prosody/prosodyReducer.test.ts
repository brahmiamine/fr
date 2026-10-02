import { describe, expect, it } from 'vitest'
import type { ProsodyExercise, ProsodySessionState } from './types'
import { createProsodySession, prosodyReducer } from './prosodyReducer'

const exercise: ProsodyExercise = {
  id: 'prosody_test',
  level: 'B1',
  category: 'opinion',
  audio: 'audio/prosody/prosody_test.wav',
  transcript: "Franchement, je pense que c'est une bonne idée.",
  groups: [
    { text: 'Franchement', start: 0, end: 0.7, intonation: 'level' },
    {
      text: "je pense que c'est une bonne idée",
      start: 0.7,
      end: 3.1,
      intonation: 'rise',
      finalLengthening: true,
    },
  ],
  imitation: { start: 0.7, end: 3.1 },
  retelling: { idea: 'Donner une opinion positive.' },
}

function reach(stage: ProsodySessionState['stage']): ProsodySessionState {
  let state = createProsodySession(exercise)

  // listening -> imitation
  state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
  state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
  state = prosodyReducer(state, { type: 'LISTEN_NEXT' })

  if (stage === 'imitation') return state

  // imitation -> comparison
  state = prosodyReducer(state, { type: 'IMITATION_LISTENED' })
  state = prosodyReducer(state, { type: 'IMITATION_RECORDED' })
  state = prosodyReducer(state, { type: 'SHADOW_DONE' })

  if (stage === 'comparison') return state

  // comparison -> retelling
  state = prosodyReducer(state, { type: 'COMPARISON_DONE' })
  state = prosodyReducer(state, { type: 'CHOOSE_FOCUS', focus: 'pause' })
  state = prosodyReducer(state, { type: 'RETRY_DONE' })
  state = prosodyReducer(state, { type: 'COMPARE_DONE' })

  return state
}

describe('prosodyReducer', () => {
  it('walks the listening steps then moves to imitation', () => {
    let state = createProsodySession(exercise)
    expect(state.stage).toBe('listening')

    state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
    expect(state.listening.step).toBe('prosody')

    state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
    expect(state.listening.step).toBe('reveal')

    state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
    expect(state.stage).toBe('imitation')
  })

  it('walks imitation listen -> record -> shadow -> comparison', () => {
    let state = reach('imitation')

    state = prosodyReducer(state, { type: 'IMITATION_LISTENED' })
    expect(state.imitation.step).toBe('record')

    state = prosodyReducer(state, { type: 'IMITATION_RECORDED' })
    expect(state.imitation.step).toBe('shadow')

    state = prosodyReducer(state, { type: 'SHADOW_DONE' })
    expect(state.stage).toBe('comparison')
    expect(state.comparison.step).toBe('aba')
  })

  it('requires a chosen focus before reaching the retry step', () => {
    const aba = reach('comparison')
    const chooseFocus = prosodyReducer(aba, { type: 'COMPARISON_DONE' })
    expect(chooseFocus.comparison.step).toBe('choose-focus')
    expect(chooseFocus.comparison.focus).toBeNull()

    // Without a focus, RETRY_DONE is a no-op.
    const blocked = prosodyReducer(chooseFocus, { type: 'RETRY_DONE' })
    expect(blocked.comparison.step).toBe('choose-focus')

    const focused = prosodyReducer(chooseFocus, { type: 'CHOOSE_FOCUS', focus: 'intonation' })
    expect(focused.comparison.step).toBe('retry')
    expect(focused.comparison.focus).toBe('intonation')
  })

  it('walks comparison through compare-attempts to retelling', () => {
    let state = reach('comparison')
    state = prosodyReducer(state, { type: 'COMPARISON_DONE' })
    state = prosodyReducer(state, { type: 'CHOOSE_FOCUS', focus: 'grouping' })
    state = prosodyReducer(state, { type: 'RETRY_DONE' })
    expect(state.comparison.step).toBe('compare-attempts')

    state = prosodyReducer(state, { type: 'COMPARE_DONE' })
    expect(state.stage).toBe('retelling')
  })

  it('completes after the retelling review', () => {
    let state = reach('retelling')
    state = prosodyReducer(state, { type: 'RETELL_START' })
    expect(state.retelling.step).toBe('record')
    state = prosodyReducer(state, { type: 'RETELL_RECORDED' })
    expect(state.retelling.step).toBe('review')
    state = prosodyReducer(state, { type: 'RETELL_DONE' })
    expect(state.completed).toBe(true)
  })
})
