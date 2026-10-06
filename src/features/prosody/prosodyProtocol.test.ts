import { describe, expect, it } from 'vitest'
import type { ProsodyExercise } from './types'
import { maxImitationSecondsFor, withImitationForLevel } from './types'
import {
  isProsodyExerciseReady,
  pickReadyProsodyExercise,
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

  it('rejects synthetic models whose timings are not plausible estimates', () => {
    const fake: ProsodyExercise = {
      ...valid,
      modelKind: 'tts',
      audio: undefined,
      timing: 'estimated',
      // "Un extrait" = 3 syllables cannot last 4 s.
    }
    expect(validateProsodyExercise(fake)).toContain('implausible-timing')
    expect(validateProsodyExercise({ ...fake, timing: undefined })).toContain(
      'tts-timing-not-estimated',
    )
  })

  it('prefers a fresh human recording over synthetic models', () => {
    const picked = pickReadyProsodyExercise([], () => 0)
    expect(picked?.modelKind).toBe('recording')
  })

  it('never exposes an invalid exercise as production-ready', () => {
    for (const exercise of readyProsodyExercises) {
      expect(validateProsodyExercise(exercise)).toEqual([])
    }
  })
})

describe('progressive imitation segment', () => {
  const long: ProsodyExercise = {
    id: 'p_long',
    level: 'B1',
    category: 'opinion',
    modelKind: 'recording',
    transcript: 'a b c d',
    groups: [
      { text: 'a', start: 0, end: 3, intonation: 'level' },
      { text: 'b', start: 3.2, end: 6.5, intonation: 'rise' },
      { text: 'c', start: 6.8, end: 10, intonation: 'level' },
      { text: 'd', start: 10.2, end: 14, intonation: 'fall' },
    ],
    imitation: { start: 0, end: 14 },
    retelling: { idea: 'x' },
    ready: true,
    source: 'test',
  }

  it('starts with one short phrase, ending on a group', () => {
    expect(maxImitationSecondsFor(0)).toBe(8)
    expect(withImitationForLevel(long, 0).imitation).toEqual({ start: 0, end: 6.5 })
  })

  it('grows with practice up to the full segment', () => {
    expect(withImitationForLevel(long, 6).imitation).toEqual({ start: 0, end: 10 })
    expect(withImitationForLevel(long, 12).imitation).toEqual({ start: 0, end: 14 })
  })

  it('keeps a learner-imported segment as chosen', () => {
    expect(withImitationForLevel({ ...long, custom: true }, 0).imitation.end).toBe(14)
  })
})
