import { describe, expect, it } from 'vitest'
import { createInitialState, RECENT_WINDOWS } from '../../types/progress'
import type { AppStateV1, SessionRecord } from '../../types/progress'
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateTotalPracticeMinutes,
  calculateWeeklyProgress,
  getWeekKey,
  recordCompletedSession,
  recordWeeklyTest,
  toLocalDateString,
  upsertExpressionExamples,
} from './progress'

function session(date: string, overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: `s-${date}`,
    date,
    completedAt: `${date}T09:00:00.000Z`,
    durationMinutes: 30,
    blockCount: 2,
    fluencyScore: 4,
    successParaphrase: '',
    expressionToReuse: '',
    errorToWatch: '',
    topicId: 't001',
    questionIds: [],
    wordIds: [],
    expressionIds: [],
    ...overrides,
  }
}

describe('streaks', () => {
  const today = new Date(2026, 9, 2) // 2026-10-02

  it('counts a streak ending today', () => {
    const sessions = [
      session('2026-09-30'),
      session('2026-10-01'),
      session('2026-10-02'),
    ]
    expect(calculateCurrentStreak(sessions, today)).toBe(3)
  })

  it('counts a streak ending yesterday', () => {
    const sessions = [session('2026-09-30'), session('2026-10-01')]
    expect(calculateCurrentStreak(sessions, today)).toBe(2)
  })

  it('returns zero when the last session is older than yesterday', () => {
    const sessions = [session('2026-09-28'), session('2026-09-29')]
    expect(calculateCurrentStreak(sessions, today)).toBe(0)
  })

  it('computes the longest streak independently of today', () => {
    const sessions = [
      session('2026-08-01'),
      session('2026-08-02'),
      session('2026-08-03'),
      session('2026-08-10'),
    ]
    expect(calculateLongestStreak(sessions)).toBe(3)
  })
})

describe('aggregation', () => {
  it('sums practice minutes', () => {
    const sessions = [
      session('2026-10-01', { durationMinutes: 30 }),
      session('2026-10-02', { durationMinutes: 12 }),
    ]
    expect(calculateTotalPracticeMinutes(sessions)).toBe(42)
  })

  it('counts sessions inside the current week toward the goal', () => {
    const today = new Date(2026, 9, 2) // Friday, week starts Monday 2026-09-28
    expect(getWeekKey(today)).toBe('2026-09-28')
    const sessions = [
      session('2026-09-27'), // previous week
      session('2026-09-28'),
      session('2026-10-02'),
    ]
    expect(calculateWeeklyProgress(sessions, today)).toEqual({
      completed: 2,
      goal: 5,
    })
  })

  it('formats local dates', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('recordCompletedSession', () => {
  it('appends the session, updates recents, and clears the in-progress session', () => {
    const initial: AppStateV1 = {
      ...createInitialState(),
      inProgressSession: {} as AppStateV1['inProgressSession'],
    }
    const next = recordCompletedSession(
      initial,
      session('2026-10-02', {
        questionIds: ['q001', 'q002'],
        wordIds: ['w001'],
        expressionIds: ['e001'],
      }),
    )
    expect(next.sessions).toHaveLength(1)
    expect(next.inProgressSession).toBeNull()
    expect(next.recentTopicIds[0]).toBe('t001')
    expect(next.recentQuestionIds).toEqual(['q001', 'q002'])
    expect(next.recentWordIds).toEqual(['w001'])
    expect(next.recentExpressionIds).toEqual(['e001'])
  })

  it('caps recent lists at their window size', () => {
    let state = createInitialState()
    for (let i = 0; i < RECENT_WINDOWS.words + 5; i += 1) {
      state = recordCompletedSession(
        state,
        session(`2026-09-${String((i % 28) + 1).padStart(2, '0')}`, {
          id: `s-${i}`,
          wordIds: [`w${i}`],
        }),
      )
    }
    expect(state.recentWordIds.length).toBeLessThanOrEqual(RECENT_WINDOWS.words)
  })
})

describe('weekly tests and examples', () => {
  it('replaces the test for the same week', () => {
    const first = {
      id: 'wt-1',
      weekKey: '2026-09-28',
      date: '2026-09-28',
      topicId: 't001',
      durationMinutes: 3,
      startDelaySeconds: 5,
      longPauses: 2,
      majorFillers: 1,
      successfulParaphrases: 3,
      abandonedSentences: 0,
      longestFluentSegmentSeconds: 40,
    }
    const second = { ...first, id: 'wt-2', longPauses: 1 }
    let state = recordWeeklyTest(createInitialState(), first)
    state = recordWeeklyTest(state, second)
    expect(state.weeklyTests).toHaveLength(1)
    expect(state.weeklyTests[0].longPauses).toBe(1)
  })

  it('upserts native expression examples by expression id', () => {
    let state = upsertExpressionExamples(createInitialState(), {
      expressionId: 'e001',
      sentences: ['a'],
      updatedAt: '2026-10-02T00:00:00.000Z',
    })
    state = upsertExpressionExamples(state, {
      expressionId: 'e001',
      sentences: ['a', 'b'],
      updatedAt: '2026-10-02T01:00:00.000Z',
    })
    expect(state.nativeExpressionExamples).toHaveLength(1)
    expect(state.nativeExpressionExamples[0].sentences).toEqual(['a', 'b'])
  })
})
