import { describe, expect, it } from 'vitest'
import {
  activeWordIndex,
  compareMarking,
  exerciseWords,
  referenceBoundaries,
  scoredBoundaries,
  spansFromBoundaries,
  wordTimeline,
} from './marking'

const exercise = {
  annotation: 'acoustic' as const,
  groups: [
    { text: 'Franchement', start: 0, end: 1, intonation: 'level' as const, intonationMeasured: true },
    { text: 'je trouve ça bien', start: 1, end: 2, intonation: 'rise' as const, intonationMeasured: true },
    { text: 'mais ça dépend', start: 2, end: 3, intonation: 'fall' as const, intonationMeasured: true },
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
    expect(result).toMatchObject({ scored: true, found: 1, missed: 1, extra: 1, total: 2 })
    expect(result.intonationCompared).toBe(1)
    expect(result.intonationMatches).toBe(1)
  })

  it('leaves out intonations the pitch curve could not settle', () => {
    const unclear = {
      ...exercise,
      groups: exercise.groups.map((group) => ({ ...group, intonationMeasured: false })),
    }
    const result = compareMarking(unclear, {
      boundaries: [0, 4],
      intonations: ['level', 'rise', 'fall'],
    })
    expect(result.found).toBe(2)
    expect(result.intonationCompared).toBe(0)
  })

  it('does not score a recording whose groups were guessed from punctuation', () => {
    const guessed = { modelKind: 'recording' as const, groups: exercise.groups }
    expect(scoredBoundaries(guessed)).toEqual([])
    expect(
      compareMarking(guessed, { boundaries: [2], intonations: ['rise', 'fall'] }),
    ).toMatchObject({ scored: false, total: 0, extra: 0, intonationCompared: 0 })
  })

  it('scores the synthetic voice only where punctuation makes it pause', () => {
    const tts = {
      modelKind: 'tts' as const,
      groups: [
        { text: 'Franchement,', start: 0, end: 1, intonation: 'rise' as const },
        { text: 'je trouve ça bien', start: 1, end: 2, intonation: 'level' as const },
        { text: 'mais ça dépend.', start: 2, end: 3, intonation: 'fall' as const },
      ],
    }
    expect(scoredBoundaries(tts)).toEqual([0])
    const result = compareMarking(tts, { boundaries: [0, 4], intonations: ['rise', 'level', 'fall'] })
    expect(result).toMatchObject({ found: 1, total: 1, extra: 0 })
    // Only the groups ending on punctuation have a trustworthy movement.
    expect(result.intonationCompared).toBe(2)
    expect(result.intonationMatches).toBe(2)
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

  it('uses measured word timings when the group carries them', () => {
    const measured = {
      groups: [
        { text: 'je pense que', start: 1, end: 2.2, intonation: 'rise' as const, words: [[1, 1.2], [1.3, 1.8], [1.8, 2.2]] as Array<[number, number]> },
      ],
    }
    expect(wordTimeline(measured)[1]).toEqual({ start: 1.3, end: 1.8 })
  })

  it('finds the word being spoken at a given time', () => {
    expect(activeWordIndex(exercise, -0.1)).toBe(-1)
    expect(activeWordIndex(exercise, 0.5)).toBe(0)
    expect(activeWordIndex(exercise, 1.05)).toBe(1)
    expect(activeWordIndex(exercise, 2.1)).toBe(3)
  })
})
