import { describe, expect, it } from 'vitest'
import { mouldsForLevel, retellingMoulds } from './moulds'
import type { ProsodyExercise } from './types'

const base = { id: 'x', level: 'B1', category: 'opinion', ready: true, source: 's', imitation: { start: 0, end: 5 }, retelling: { idea: '' } }

describe('retellingMoulds', () => {
  it('finds the rise, the firm fall, the dislocation and the marker of the excerpt', () => {
    const exercise: ProsodyExercise = {
      ...base,
      transcript: 'Moi, ce film, en fait je ne l’ai pas aimé.',
      groups: [
        { text: 'Moi', start: 0, end: 0.5, intonation: 'rise', intonationMeasured: true },
        { text: 'en fait je ne l’ai pas aimé', start: 0.5, end: 3, intonation: 'fall', intonationMeasured: true },
      ],
    }
    const moulds = retellingMoulds(exercise)
    expect(moulds.some((item) => item.includes('montée de continuation'))).toBe(true)
    expect(moulds.some((item) => item.includes('finale qui descend'))).toBe(true)
    expect(moulds.some((item) => item.includes('dislocation'))).toBe(true)
    expect(moulds.some((item) => item.includes('en fait'))).toBe(true)
  })

  it('falls back to generic moulds, and grows from one to three with practice', () => {
    const exercise: ProsodyExercise = {
      ...base,
      transcript: 'Voilà',
      groups: [{ text: 'Voilà', start: 0, end: 1, intonation: 'level' }],
    }
    const moulds = retellingMoulds(exercise)
    expect(moulds.length).toBeGreaterThanOrEqual(2)
    expect(mouldsForLevel(['a', 'b', 'c', 'd'], 0)).toEqual(['a'])
    expect(mouldsForLevel(['a', 'b', 'c', 'd'], 6)).toEqual(['a', 'b', 'c'])
  })
})
