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
  captureWordGap,
  createWordGap,
  formatDuration,
  getWeekKey,
  markFluencyNoteUsed,
  masteredGapCount,
  recordCompletedSession,
  trainingLevelForSessionCount,
  upsertChunkReview,
  upsertFluencyNote,
  upsertPersonalChunk,
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

describe('streaks and aggregation', () => {
  const today = new Date(2026, 9, 2)

  it('counts current and longest streaks', () => {
    const sessions = [
      session('2026-09-30'),
      session('2026-10-01'),
      session('2026-10-02'),
    ]
    expect(calculateCurrentStreak(sessions, today)).toBe(3)
    expect(calculateLongestStreak(sessions)).toBe(3)
  })

  it('sums and formats practice time', () => {
    expect(
      calculateTotalPracticeMinutes([
        session('2026-10-01', { durationMinutes: 30 }),
        session('2026-10-02', { durationMinutes: 12 }),
      ]),
    ).toBe(42)
    expect(formatDuration(275)).toBe('4 h 35')
  })

  it('counts sessions inside the current week', () => {
    expect(getWeekKey(today)).toBe('2026-09-28')
    const sessions = [
      session('2026-09-27'),
      session('2026-09-28'),
      session('2026-10-02'),
    ]
    expect(calculateWeeklyProgress(sessions, today)).toEqual({ completed: 2, goal: 5 })
  })
})

describe('adaptive preparation', () => {
  it('progresses from 10s to 5s to 3s through session counts', () => {
    expect(trainingLevelForSessionCount(0)).toBe(1)
    expect(trainingLevelForSessionCount(5)).toBe(2)
    expect(trainingLevelForSessionCount(15)).toBe(3)
  })

  it('updates the stored level after completing sessions', () => {
    let state = createInitialState()
    for (let i = 0; i < 5; i += 1) {
      state = recordCompletedSession(
        state,
        session('2026-10-02', { id: `s-${i}` }),
      )
    }
    expect(state.level).toBe(2)
  })
})

describe('closed learning loop', () => {
  it('stores the idea context with a missing word and enriches old empty context', () => {
    let state = captureWordGap(
      createInitialState(),
      'prise électrique',
      'l’endroit dans le mur où on branche un appareil',
    )
    expect(state.wordGaps[0].context).toContain('mur')

    state = captureWordGap(state, 'prise électrique', 'autre contexte')
    expect(state.wordGaps).toHaveLength(1)
  })

  it('turns a useful expression into a personal chunk due tomorrow', () => {
    const state = upsertPersonalChunk(
      createInitialState(),
      'Ce que je veux dire, c’est que…',
      'Reformuler une idée',
      new Date(2026, 9, 2),
    )
    expect(state.personalChunks).toHaveLength(1)
    expect(state.personalChunks[0].intent).toBe('Reformuler une idée')
    expect(state.personalChunks[0].nextReview).toBe('2026-10-03')
  })

  it('schedules feedback notes for later reuse', () => {
    let state = upsertFluencyNote(
      createInitialState(),
      'importantError',
      'Attention à depuis',
      new Date(2026, 9, 2),
    )
    const id = state.fluencyNotes[0].id
    expect(state.fluencyNotes[0].nextReview).toBe('2026-10-03')

    state = markFluencyNoteUsed(state, id, new Date(2026, 9, 3))
    expect(state.fluencyNotes[0].timesSeen).toBe(1)
    expect(state.fluencyNotes[0].nextReview).toBe('2026-10-06')
  })
})

describe('spaced retrieval state', () => {
  it('reviews chunks on J+1, J+3 and J+7 before mastery', () => {
    let state = upsertChunkReview(
      createInitialState(),
      'chunk_001',
      'easy',
      new Date(2026, 9, 2),
    )
    expect(state.chunkReviews[0].nextReview).toBe('2026-10-03')
    expect(state.chunkReviews[0].mastered).toBe(false)

    state = upsertChunkReview(state, 'chunk_001', 'easy', new Date(2026, 9, 3))
    expect(state.chunkReviews[0].nextReview).toBe('2026-10-05')
    expect(state.chunkReviews[0].mastered).toBe(false)

    state = upsertChunkReview(state, 'chunk_001', 'easy', new Date(2026, 9, 5))
    expect(state.chunkReviews[0].nextReview).toBe('2026-10-09')
    expect(state.chunkReviews[0].mastered).toBe(false)

    state = upsertChunkReview(state, 'chunk_001', 'easy', new Date(2026, 9, 9))
    expect(state.chunkReviews[0].mastered).toBe(true)
  })

  it('reviews word gaps on J+1, J+3 and J+7 before mastery', () => {
    let state: AppState = {
      ...createInitialState(),
      wordGaps: [
        createWordGap(
          'prise électrique',
          'où brancher un appareil',
          new Date(2026, 9, 2),
        ),
      ],
    }
    const id = state.wordGaps[0].id
    expect(state.wordGaps[0].nextReview).toBe('2026-10-03')

    state = applyGapResult(state, id, true, new Date(2026, 9, 3))
    expect(state.wordGaps[0].nextReview).toBe('2026-10-05')
    expect(state.wordGaps[0].status).toBe('learning')

    state = applyGapResult(state, id, true, new Date(2026, 9, 5))
    expect(state.wordGaps[0].nextReview).toBe('2026-10-09')
    expect(state.wordGaps[0].status).toBe('learning')

    state = applyGapResult(state, id, true, new Date(2026, 9, 9))
    expect(state.wordGaps[0].status).toBe('mastered')
    expect(masteredGapCount(state)).toBe(1)
  })

  it('counts native and personal active chunks', () => {
    let state = upsertPersonalChunk(createInitialState(), 'Bref…', 'Conclure')
    expect(activeChunkCount(state)).toBeGreaterThan(18)
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
