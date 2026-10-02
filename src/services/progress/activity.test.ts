import { describe, expect, it } from 'vitest'
import type { SessionRecord } from '../../types/progress'
import {
  activityHeatmap,
  currentWeekDates,
  minutesByWeekDay,
  practicedWeekDays,
} from './activity'

// Thursday 1 October 2026.
const today = new Date(2026, 9, 1)

function session(date: string, durationMinutes = 30): SessionRecord {
  return {
    id: date,
    date,
    completedAt: `${date}T10:00:00.000Z`,
    durationMinutes,
    blockCount: 0,
    fluencyScore: 3,
    blockedWord: '',
    expressionToReuse: '',
    topicId: 't001',
    questionIds: [],
    chunkIds: [],
    genericWordIds: [],
    summary: { chunksWorked: 4, gapsPracticed: 5, questionsAsked: 5, fluencyDone: true },
  }
}

describe('activity', () => {
  it('lists the current week from Monday', () => {
    expect(currentWeekDates(today)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
  })

  it('marks the practised days and sums minutes per day', () => {
    const sessions = [session('2026-09-28', 20), session('2026-09-28', 10), session('2026-10-01')]
    expect(practicedWeekDays(sessions, today)).toEqual([
      true, false, false, true, false, false, false,
    ])
    expect(minutesByWeekDay(sessions, today)).toEqual([30, 0, 0, 30, 0, 0, 0])
  })

  it('builds a 12-week heatmap with future days left empty', () => {
    const days = activityHeatmap([session('2026-10-01', 40), session('2026-09-29', 5)], today)
    expect(days).toHaveLength(84)
    expect(days[0].date).toBe('2026-07-13')
    expect(days.find((day) => day.date === '2026-10-01')?.level).toBe(3)
    expect(days.find((day) => day.date === '2026-09-29')?.level).toBe(1)
    expect(days.find((day) => day.date === '2026-10-02')?.level).toBeNull()
  })
})
