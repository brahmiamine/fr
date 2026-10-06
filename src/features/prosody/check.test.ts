import { describe, expect, it } from 'vitest'
import { nextCheckKind, parseStoredRating, ratingKey, ratingsToCsv, summarizeRatings } from './check'
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
