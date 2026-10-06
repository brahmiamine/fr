import { describe, expect, it } from 'vitest'
import { CHORUS_PASSES } from './types'
import type { ProsodyExercise, ProsodySessionState } from './types'
import { createProsodySession, prosodyReducer } from './prosodyReducer'

const exercise: ProsodyExercise = {
  id: 'prosody_test',
  level: 'B1',
  category: 'opinion',
  audio: 'audio/prosody/prosody_test.wav',
  transcript: "Franchement, je pense que c'est une bonne idée.",
  groups: [
    { text: 'Franchement', start: 0, end: 2, intonation: 'level' },
    { text: "je pense que c'est une bonne idée", start: 2, end: 7, intonation: 'rise' },
    { text: 'mais ça dépend', start: 7, end: 12, intonation: 'fall' },
  ],
  imitation: { start: 2, end: 9 },
  retelling: { idea: 'Donner une opinion positive.' },
  ready: true,
  source: 'test',
}

function reach(stage: ProsodySessionState['stage']): ProsodySessionState {
  let state = createProsodySession(exercise)

  state = prosodyReducer(state, { type: 'LISTEN_PLAYED' })
  state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
  state = prosodyReducer(state, { type: 'LISTEN_PLAYED' })
  state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
  state = prosodyReducer(state, {
    type: 'LISTEN_MARKED',
    marking: { boundaries: [0], intonations: ['level', 'fall'] },
  })
  state = prosodyReducer(state, { type: 'LISTEN_NEXT' })

  if (stage === 'imitation') return state

  state = prosodyReducer(state, { type: 'IMITATION_MODEL_PLAYED' })
  state = prosodyReducer(state, { type: 'IMITATION_MODEL_PLAYED' })
  state = prosodyReducer(state, { type: 'IMITATION_LISTENED' })
  state = prosodyReducer(state, { type: 'IMITATION_RECORDED' })
  for (let pass = 0; pass < CHORUS_PASSES; pass += 1) {
    state = prosodyReducer(state, { type: 'SHADOW_PLAYED' })
  }
  state = prosodyReducer(state, { type: 'SHADOW_DONE' })
  state = prosodyReducer(state, { type: 'MEMORY_DONE' })

  if (stage === 'comparison') return state

  state = prosodyReducer(state, { type: 'ABA_COMPLETE' })
  state = prosodyReducer(state, { type: 'COMPARISON_DONE' })
  state = prosodyReducer(state, { type: 'CHOOSE_FOCUS', focus: 'pause' })
  state = prosodyReducer(state, { type: 'RETRY_DONE' })
  state = prosodyReducer(state, { type: 'COMPARE_DONE' })

  return state
}

describe('prosodyReducer protocol gates', () => {
  it('makes the learner mark the grouping before revealing the model', () => {
    let state = createProsodySession(exercise)
    state = prosodyReducer(state, { type: 'LISTEN_PLAYED' })
    state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
    state = prosodyReducer(state, { type: 'LISTEN_PLAYED' })
    state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
    expect(state.listening.step).toBe('mark')

    state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
    expect(state.listening.step).toBe('mark')

    const marking = { boundaries: [0, 7], intonations: ['level', 'rise', 'fall'] as const }
    state = prosodyReducer(state, {
      type: 'LISTEN_MARKED',
      marking: { boundaries: [...marking.boundaries], intonations: [...marking.intonations] },
    })
    expect(state.listening.step).toBe('reveal')
    expect(state.listening.marking?.boundaries).toEqual([0, 7])
  })

  it('uses the progressive retelling goal chosen at creation', () => {
    let state = createProsodySession(exercise, new Date(), { minSeconds: 60, targetSeconds: 120 })
    state = { ...state, stage: 'retelling', retelling: { ...state.retelling, step: 'record' } }
    expect(prosodyReducer(state, { type: 'RETELL_RECORDED', durationSeconds: 45 }).retelling.step).toBe('record')
    expect(prosodyReducer(state, { type: 'RETELL_RECORDED', durationSeconds: 61 }).retelling.step).toBe('review')
  })

  it('cannot leave either listening step before the required full listen', () => {
    let state = createProsodySession(exercise)
    state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
    expect(state.listening.step).toBe('meaning')

    state = prosodyReducer(state, { type: 'LISTEN_PLAYED' })
    state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
    expect(state.listening.step).toBe('prosody')

    state = prosodyReducer(state, { type: 'LISTEN_NEXT' })
    expect(state.listening.step).toBe('prosody')
  })

  it('requires two model listens, six chorusing passes and the segment said from memory', () => {
    let state = reach('imitation')

    state = prosodyReducer(state, { type: 'IMITATION_MODEL_PLAYED' })
    state = prosodyReducer(state, { type: 'IMITATION_LISTENED' })
    expect(state.imitation.step).toBe('listen')

    state = prosodyReducer(state, { type: 'IMITATION_MODEL_PLAYED' })
    state = prosodyReducer(state, { type: 'IMITATION_LISTENED' })
    expect(state.imitation.step).toBe('record')

    state = prosodyReducer(state, { type: 'IMITATION_RECORDED' })
    state = prosodyReducer(state, { type: 'SHADOW_DONE' })
    expect(state.stage).toBe('imitation')

    for (let pass = 0; pass < CHORUS_PASSES - 1; pass += 1) {
      state = prosodyReducer(state, { type: 'SHADOW_PLAYED' })
    }
    state = prosodyReducer(state, { type: 'SHADOW_DONE' })
    expect(state.imitation.step).toBe('shadow')

    state = prosodyReducer(state, { type: 'SHADOW_PLAYED' })
    state = prosodyReducer(state, { type: 'SHADOW_DONE' })
    expect(state.stage).toBe('imitation')
    expect(state.imitation.step).toBe('memory')

    state = prosodyReducer(state, { type: 'MEMORY_DONE' })
    expect(state.stage).toBe('comparison')
  })

  it('starts a review with the cold version, before any listening', () => {
    let state = createProsodySession(exercise, new Date(), undefined, true)
    expect(state.stage).toBe('cold')
    state = prosodyReducer(state, { type: 'LISTEN_PLAYED' })
    expect(state.listening.meaningPlays).toBe(0)
    state = prosodyReducer(state, { type: 'COLD_RECORDED' })
    expect(state.stage).toBe('listening')
    expect(createProsodySession(exercise).stage).toBe('listening')
  })

  it('requires a completed automatic A/B/A sequence', () => {
    let state = reach('comparison')
    state = prosodyReducer(state, { type: 'COMPARISON_DONE' })
    expect(state.comparison.step).toBe('aba')

    state = prosodyReducer(state, { type: 'ABA_COMPLETE' })
    state = prosodyReducer(state, { type: 'COMPARISON_DONE' })
    expect(state.comparison.step).toBe('choose-focus')
  })

  it('requires one chosen focus before retry', () => {
    let state = reach('comparison')
    state = prosodyReducer(state, { type: 'ABA_COMPLETE' })
    state = prosodyReducer(state, { type: 'COMPARISON_DONE' })

    const blocked = prosodyReducer(state, { type: 'RETRY_DONE' })
    expect(blocked.comparison.step).toBe('choose-focus')

    state = prosodyReducer(state, { type: 'CHOOSE_FOCUS', focus: 'intonation' })
    expect(state.comparison.step).toBe('retry')
  })

  it('requires at least 30 seconds of retelling before review', () => {
    let state = reach('retelling')
    state = prosodyReducer(state, { type: 'RETELL_START' })
    state = prosodyReducer(state, { type: 'RETELL_RECORDED', durationSeconds: 29 })
    expect(state.retelling.step).toBe('record')

    state = prosodyReducer(state, { type: 'RETELL_RECORDED', durationSeconds: 30 })
    expect(state.retelling.step).toBe('review')
    expect(state.retelling.durationSeconds).toBe(30)

    state = prosodyReducer(state, { type: 'RETELL_DONE' })
    expect(state.completed).toBe(true)
  })
})
