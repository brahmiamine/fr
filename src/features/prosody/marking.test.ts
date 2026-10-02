import { describe, expect, it } from 'vitest'
import {
  activeWordIndex,
  compareMarking,
  exerciseWords,
  referenceBoundaries,
  spansFromBoundaries,
  wordTimeline,
} from './marking'

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

describe('word timeline', () => {
  const exercise = {
    groups: [
      { text: 'Franchement', start: 0, end: 1, intonation: 'level' as const },
      { text: 'je pense que', start: 1, end: 2.2, intonation: 'rise' as const },
    ],
  }

  it('gives every word a slot inside its group, in order', () => {
    const timeline = wordTimeline(exercise)
    expect(timeline).toHaveLength(4)
    expect(timeline[0]).toEqual({ start: 0, end: 1 })
    expect(timeline[1].start).toBeCloseTo(1)
    expect(timeline[3].end).toBeCloseTo(2.2)
    for (let i = 1; i < timeline.length; i += 1) {
      expect(timeline[i].start).toBeCloseTo(timeline[i - 1].end)
    }
  })

  it('finds the word being spoken at a given time', () => {
    expect(activeWordIndex(exercise, -0.1)).toBe(-1)
    expect(activeWordIndex(exercise, 0.5)).toBe(0)
    expect(activeWordIndex(exercise, 1.05)).toBe(1)
    expect(activeWordIndex(exercise, 2.1)).toBe(3)
  })
})
