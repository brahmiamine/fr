import { describe, expect, it } from 'vitest'
import type { ProsodyExercise } from './types'
import {
  isProsodyExerciseReady,
  readyProsodyExercises,
  validateProsodyExercise,
} from '../../services/content/prosodyRepository'

const valid: ProsodyExercise = {
  id: 'valid',
  level: 'B1',
  category: 'test',
  audio: 'audio/prosody/valid.wav',
  transcript: 'Un extrait de test suffisamment long.',
  groups: [
    { text: 'Un extrait', start: 0, end: 4, intonation: 'level' },
    { text: 'de test', start: 4, end: 8, intonation: 'rise' },
    { text: 'suffisamment long', start: 8, end: 14, intonation: 'fall' },
  ],
  imitation: { start: 4, end: 10 },
  retelling: { idea: 'Reformuler la même idée.' },
  ready: true,
  source: 'test',
}

describe('prosody content protocol', () => {
  it('accepts only ready 10–30 s excerpts with 5–15 s imitation segments', () => {
    expect(validateProsodyExercise(valid)).toEqual([])
    expect(isProsodyExerciseReady(valid)).toBe(true)
  })

  it('rejects placeholders even if their structure is otherwise valid', () => {
    expect(isProsodyExerciseReady({ ...valid, ready: false })).toBe(false)
  })

  it('never exposes an invalid exercise as production-ready', () => {
    for (const exercise of readyProsodyExercises) {
      expect(validateProsodyExercise(exercise)).toEqual([])
    }
  })
})
