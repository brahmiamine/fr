import { describe, expect, it } from 'vitest'
import { createInitialState, RECENT_WINDOWS } from '../../types/progress'
import type { AppState, SessionRecord } from '../../types/progress'
import {
  activeChunkCount,
  applyGapResult,
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateTotalPracticeMinutes,
  calculateWeeklyProgress,
  createWordGap,
  formatDuration,
  getWeekKey,
  masteredGapCount,
  recordCompletedSession,
  recordWeeklyTest,
  upsertChunkReview,
  upsertPersonalExample,
} from './progress'

function session(date: string, overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: `s-${date}`,
    date,
    completedAt: `${date}T09:00:00.000Z`,
    durationMinutes: 30,
    blockCount: 2,
    fluencyScore: 4,
    blockedWord: '',
    expressionToReuse: '',
    topicId: 't001',
    questionIds: [],
    chunkIds: [],
    genericWordIds: [],
    summary: {
      chunksWorked: 3,
      gapsPracticed: 5,
      questionsAsked: 5,
      fluencyDone: true,
    },
    ...overrides,
  }
}

describe('streaks', () => {
  const today = new Date(2026, 9, 2)

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
    expect(calculateCurrentStreak([session('2026-09-28')], today)).toBe(0)
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

  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(35)).toBe('35 min')
    expect(formatDuration(275)).toBe('4 h 35')
  })

  it('counts sessions inside the current week toward the goal', () => {
    const today = new Date(2026, 9, 2)
    expect(getWeekKey(today)).toBe('2026-09-28')
    const sessions = [session('2026-09-27'), session('2026-09-28'), session('2026-10-02')]
    expect(calculateWeeklyProgress(sessions, today)).toEqual({ completed: 2, goal: 5 })
  })
})

describe('recordCompletedSession', () => {
  it('appends the session, updates recents, and clears the in-progress session', () => {
    const initial: AppState = {
      ...createInitialState(),
      inProgressSession: {} as AppState['inProgressSession'],
    }
    const next = recordCompletedSession(
      initial,
      session('2026-10-02', {
        questionIds: ['q001', 'q002'],
        chunkIds: ['chunk_001'],
        genericWordIds: ['w001'],
      }),
    )
    expect(next.sessions).toHaveLength(1)
    expect(next.inProgressSession).toBeNull()
    expect(next.recentTopicIds[0]).toBe('t001')
    expect(next.recentQuestionIds).toEqual(['q001', 'q002'])
    expect(next.recentChunkIds).toEqual(['chunk_001'])
    expect(next.recentWordIds).toEqual(['w001'])
  })

  it('caps recent lists at their window size', () => {
    let state = createInitialState()
    for (let i = 0; i < RECENT_WINDOWS.words + 5; i += 1) {
      state = recordCompletedSession(
        state,
        session('2026-09-01', { id: `s-${i}`, genericWordIds: [`w${i}`] }),
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
      score: 3,
    }
    let state = recordWeeklyTest(createInitialState(), first)
    state = recordWeeklyTest(state, { ...first, id: 'wt-2', longPauses: 1 })
    expect(state.weeklyTests).toHaveLength(1)
    expect(state.weeklyTests[0].longPauses).toBe(1)
  })

  it('upserts personal examples by chunk id', () => {
    let state = upsertPersonalExample(createInitialState(), {
      chunkId: 'chunk_001',
      sentences: ['a'],
      updatedAt: '2026-10-02T00:00:00.000Z',
    })
    state = upsertPersonalExample(state, {
      chunkId: 'chunk_001',
      sentences: ['a', 'b'],
      updatedAt: '2026-10-02T01:00:00.000Z',
    })
    expect(state.personalExamples).toHaveLength(1)
    expect(state.personalExamples[0].sentences).toEqual(['a', 'b'])
  })
})

describe('spaced retrieval state', () => {
  it('schedules a chunk review on first recall', () => {
    const state = upsertChunkReview(createInitialState(), 'chunk_001', 'easy')
    expect(state.chunkReviews).toHaveLength(1)
    expect(state.chunkReviews[0].interval).toBe(7)
    expect(state.chunkReviews[0].timesSeen).toBe(1)
  })

  it('marks a chunk mastered after two easy recalls', () => {
    let state = upsertChunkReview(createInitialState(), 'chunk_001', 'easy')
    state = upsertChunkReview(state, 'chunk_001', 'easy')
    expect(state.chunkReviews[0].mastered).toBe(true)
  })

  it('schedules word gaps and counts mastered gaps', () => {
    let state: AppState = {
      ...createInitialState(),
      wordGaps: [createWordGap('prise électrique', '')],
    }
    const id = state.wordGaps[0].id
    state = applyGapResult(state, id, false)
    expect(state.wordGaps[0].successCount).toBe(0)
    expect(state.wordGaps[0].status).toBe('learning')

    state = applyGapResult(state, id, true)
    expect(state.wordGaps[0].successCount).toBe(1)
    state = applyGapResult(state, id, true)
    expect(state.wordGaps[0].status).toBe('mastered')
    expect(masteredGapCount(state)).toBe(1)
  })

  it('counts active chunks', () => {
    const state = upsertChunkReview(createInitialState(), 'chunk_001', 'easy')
    expect(activeChunkCount(state)).toBeGreaterThan(0)
  })
})
