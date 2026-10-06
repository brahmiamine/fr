import { describe, expect, it } from 'vitest'
import { checkStatus, nextCheckKind, parseStoredRating, ratingKey, ratingsToCsv, summarizeRatings } from './check'
import type { ProsodyCheckKind, ProsodyCheckRecord, StoredRating } from './check'

describe('nextCheckKind', () => {
  it('walks S0 → S4 → S8 then stops', () => {
    expect(nextCheckKind([])).toBe('S0')
    expect(nextCheckKind(['S0'])).toBe('S4')
    expect(nextCheckKind(['S0', 'S4'])).toBe('S8')
    expect(nextCheckKind(['S0', 'S4', 'S8'])).toBeNull()
  })

  it('recovers a missed intermediate bilan', () => {
    expect(nextCheckKind(['S4'] as ProsodyCheckKind[])).toBe('S0')
  })
})

describe('checkStatus', () => {
  const at = (date: string, kind: ProsodyCheckKind) => ({ kind, date: `${date}T10:00:00.000Z` })

  it('offers S0 straight away', () => {
    expect(checkStatus([], new Date('2026-10-01T12:00:00'))).toEqual({ state: 'due', kind: 'S0', availableOn: null })
  })

  it('holds S4 back until 4 weeks after S0, and S8 until 8 weeks', () => {
    const s0 = at('2026-10-01', 'S0')
    const sameDay = checkStatus([s0], new Date('2026-10-01T18:00:00'))
    expect(sameDay).toEqual({ state: 'wait', kind: 'S4', availableOn: '2026-10-29' })
    expect(checkStatus([s0], new Date('2026-10-28T12:00:00')).state).toBe('wait')
    expect(checkStatus([s0], new Date('2026-10-29T12:00:00')).state).toBe('due')

    const both = [s0, at('2026-10-30', 'S4')]
    expect(checkStatus(both, new Date('2026-10-30T12:00:00'))).toMatchObject({ state: 'wait', kind: 'S8', availableOn: '2026-11-26' })
    expect(checkStatus(both, new Date('2026-12-01T12:00:00')).state).toBe('due')
  })

  it('is done once the three bilans are recorded', () => {
    const all = [at('2026-10-01', 'S0'), at('2026-10-30', 'S4'), at('2026-11-30', 'S8')]
    expect(checkStatus(all)).toEqual({ state: 'done', kind: null, availableOn: null })
  })
})

describe('blind ratings', () => {
  const item = (id: string, kind: 'story' | 'argument' | 'reading') => ({
    id,
    kind,
    prompt: '',
    audioId: `audio-${id}`,
    measures: null,
  })
  const records: ProsodyCheckRecord[] = [
    { id: 'c0', kind: 'S0', date: '2026-10-01', items: [item('a', 'story'), item('b', 'reading')] },
    { id: 'c4', kind: 'S4', date: '2026-11-01', items: [item('c', 'story'), item('d', 'argument')] },
  ]
  const rating = (rater: string, itemId: string, value: number): StoredRating => ({
    rater,
    itemId,
    comprehensibility: value,
    accent: value,
    naturalness: value,
  })

  it('averages spontaneous recordings per rater and bilan, ignoring reading', () => {
    const rows = summarizeRatings(records, [
      rating('Moi', 'a', 4),
      rating('Moi', 'b', 9),
      rating('Moi', 'c', 6),
      rating('Moi', 'd', 8),
      rating('Claire', 'a', 3),
    ])
    expect(rows).toEqual([
      { rater: 'Claire', kind: 'S0', count: 1, comprehensibility: 3, accent: 3, naturalness: 3 },
      { rater: 'Moi', kind: 'S0', count: 1, comprehensibility: 4, accent: 4, naturalness: 4 },
      { rater: 'Moi', kind: 'S4', count: 2, comprehensibility: 7, accent: 7, naturalness: 7 },
    ])
  })

  it('keeps one rating per rater and recording, and reads old unnamed ratings as the learner’s', () => {
    expect(ratingKey('Claire', 'a')).toBe('rating-Claire::a')
    expect(ratingKey('  ', 'a')).toBe('rating-Moi::a')
    const scores = { comprehensibility: 5, accent: 6, naturalness: 7 }
    expect(parseStoredRating('rating-Claire::a-1', scores)).toMatchObject({ rater: 'Claire', itemId: 'a-1' })
    expect(parseStoredRating('rating-a-1', scores)).toMatchObject({ rater: 'Moi', itemId: 'a-1' })
    expect(parseStoredRating('rating-x', { comprehensibility: 5 })).toBeNull()
  })

  it('exports one CSV line per rating with the bilan revealed', () => {
    const csv = ratingsToCsv(records, [rating('Claire', 'c', 7)])
    expect(csv.split('\n')).toEqual([
      'rater,bilan,date,recording,comprehensibility,accent,naturalness',
      '"Claire","S4","2026-11-01","story","7","7","7"',
    ])
  })
})
