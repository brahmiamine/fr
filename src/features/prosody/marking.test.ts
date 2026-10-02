import { describe, expect, it } from 'vitest'
import { compareMarking, exerciseWords, referenceBoundaries, spansFromBoundaries } from './marking'

const exercise = {
  groups: [
    { text: 'Franchement', start: 0, end: 1, intonation: 'level' as const },
    { text: 'je trouve ça bien', start: 1, end: 2, intonation: 'rise' as const },
    { text: 'mais ça dépend', start: 2, end: 3, intonation: 'fall' as const },
  ],
}

describe('prosody marking helpers', () => {
  it('derives words and model boundaries from the groups', () => {
    expect(exerciseWords(exercise)).toHaveLength(8)
    expect(referenceBoundaries(exercise)).toEqual([0, 4])
    expect(spansFromBoundaries(8, [4, 0])).toEqual([[0, 0], [1, 4], [5, 7]])
  })

  it('counts found, missed and extra boundaries and compares intonation', () => {
    const result = compareMarking(exercise, {
      boundaries: [0, 2],
      intonations: ['level', 'rise', 'fall'],
    })
    expect(result).toMatchObject({ found: 1, missed: 1, extra: 1, total: 2 })
    expect(result.intonationCompared).toBe(1)
    expect(result.intonationMatches).toBe(1)
  })
})
