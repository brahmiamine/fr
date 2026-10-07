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
  deleteWordGap,
  editWordGap,
  newWordGapsToday,
  findComparisonTest,
  formatDuration,
  getWeekKey,
  markFluencyNoteUsed,
  masteredGapCount,
  recordCompletedSession,
  recentProsodyFocus,
  recordProsodySession,
  trainingLevelForSessionCount,
  trainingLevelForSessions,
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

  it('keeps a longer preparation while surprise questions still block a lot', () => {
    const days = Array.from({ length: 15 }, (_, index) =>
      `2026-09-${String(index + 1).padStart(2, '0')}`,
    )
    const easy = { none: 4, some: 1, much: 0 }
    const hard = { none: 1, some: 1, much: 3 }
    const withBlocks = (blocks: typeof easy) =>
      days.map((day) =>
        session(day, {
          summary: {
            chunksWorked: 4,
            gapsPracticed: 5,
            questionsAsked: 5,
            fluencyDone: true,
            questionBlocks: blocks,
          },
        }),
      )
    expect(trainingLevelForSessions(withBlocks(easy))).toBe(3)
    expect(trainingLevelForSessions(withBlocks(hard))).toBe(2)
    expect(trainingLevelForSessions(withBlocks(hard).slice(0, 6))).toBe(1)
    // Older sessions without question data fall back to the session count.
    expect(trainingLevelForSessions(days.map((day) => session(day)))).toBe(3)
  })

  it('finds the prosody point the learner works on most often', () => {
    const record = (id: string, focus: 'pause' | 'intonation' | null) => ({
      id,
      exerciseId: 'prosody_001',
      date: '2026-10-01',
      completedAt: `2026-10-01T0${id}:00:00.000Z`,
      durationMinutes: 12,
      focus,
      retellingSeconds: 40,
    })
    expect(recentProsodyFocus([])).toBeNull()
    expect(
      recentProsodyFocus([
        record('1', 'pause'),
        record('2', 'intonation'),
        record('3', 'pause'),
        record('4', null),
      ]),
    ).toBe('pause')
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

  it('brings a word back tomorrow when the learner blocks on it again, even mastered', () => {
    const created = new Date(2026, 9, 1)
    let state = captureWordGap(createInitialState(), 'échéance', 'la date limite pour payer', created)
    state = {
      ...state,
      wordGaps: [{ ...state.wordGaps[0], status: 'mastered', successCount: 3, nextReview: '2026-11-10' }],
    }
    const later = new Date(2026, 9, 12)
    state = captureWordGap(state, "L'échéance", 'autre idée', later)
    expect(state.wordGaps).toHaveLength(1)
    expect(state.wordGaps[0]).toMatchObject({
      target: 'échéance',
      context: 'la date limite pour payer',
      status: 'learning',
      successCount: 0,
      nextReview: '2026-10-13',
      timesBlocked: 1,
      lastBlockedAt: '2026-10-12',
    })
    // Noted twice the same day: counted once; an overdue word stays due.
    state = captureWordGap(state, 'echeance', '', later)
    expect(state.wordGaps[0].timesBlocked).toBe(1)
    state = { ...state, wordGaps: [{ ...state.wordGaps[0], nextReview: '2026-10-05' }] }
    state = captureWordGap(state, 'échéance', '', new Date(2026, 9, 14))
    expect(state.wordGaps[0].nextReview).toBe('2026-10-05')
    expect(state.wordGaps[0].timesBlocked).toBe(2)
  })

  it('recognises the same word with an article, accents or quotes', () => {
    let state = captureWordGap(createInitialState(), 'prise électrique', 'dans le mur')
    state = captureWordGap(state, '« La prise electrique »', 'autre')
    state = captureWordGap(state, "l'embouteillage", 'trop de voitures')
    state = captureWordGap(state, 'embouteillage', 'bouchon')
    expect(state.wordGaps.map((gap) => gap.target)).toEqual(['prise électrique', "l'embouteillage"])
  })

  it('edits and deletes a word, and counts the new words of the day', () => {
    const now = new Date(2026, 9, 7)
    let state = captureWordGap(createInitialState(), 'prise', 'dans le mur', now)
    state = captureWordGap(state, 'loyer', 'ce que je paie chaque mois', now)
    expect(newWordGapsToday(state, now)).toBe(2)
    const id = state.wordGaps[0].id
    state = editWordGap(state, id, { target: 'prise électrique', context: '' })
    expect(state.wordGaps.find((gap) => gap.id === id)).toMatchObject({ target: 'prise électrique', context: '' })
    state = editWordGap(state, id, { target: '  ' })
    expect(state.wordGaps.find((gap) => gap.id === id)?.target).toBe('prise électrique')
    state = deleteWordGap(state, id)
    expect(state.wordGaps.map((gap) => gap.target)).toEqual(['loyer'])
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

  it('restarts the whole J+1 → J+3 → J+7 path after a failed recall', () => {
    let state = createInitialState()
    const days = [2, 3, 5]
    for (const day of days) {
      state = upsertChunkReview(state, 'chunk_001', 'easy', new Date(2026, 9, day))
    }
    state = upsertChunkReview(state, 'chunk_001', 'failed', new Date(2026, 9, 9))
    expect(state.chunkReviews[0].nextReview).toBe('2026-10-10')
    expect(state.chunkReviews[0].streak).toBe(0)

    state = upsertChunkReview(state, 'chunk_001', 'easy', new Date(2026, 9, 10))
    expect(state.chunkReviews[0].mastered).toBe(false)
    expect(state.chunkReviews[0].nextReview).toBe('2026-10-11')
  })

  it('requires an easy recall to master a chunk and treats discovery as day 0', () => {
    let state = upsertChunkReview(
      createInitialState(),
      'chunk_001',
      'discovered',
      new Date(2026, 9, 2),
    )
    expect(state.chunkReviews[0].nextReview).toBe('2026-10-03')
    expect(state.chunkReviews[0].timesRecalled).toBe(0)

    state = upsertChunkReview(state, 'chunk_001', 'easy', new Date(2026, 9, 3))
    state = upsertChunkReview(state, 'chunk_001', 'easy', new Date(2026, 9, 5))
    state = upsertChunkReview(state, 'chunk_001', 'difficult', new Date(2026, 9, 9))
    expect(state.chunkReviews[0].mastered).toBe(false)
    expect(state.chunkReviews[0].nextReview).toBe('2026-10-13')

    state = upsertChunkReview(state, 'chunk_001', 'easy', new Date(2026, 9, 13))
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

  it('records prosody sessions and avoids immediate repetition', () => {
    const state = createInitialState()
    const next = recordProsodySession(state, {
      id: 'p1',
      exerciseId: 'prosody_001',
      date: '2026-10-02',
      completedAt: '2026-10-02T11:00:00.000Z',
      durationMinutes: 12,
      focus: 'rhythm',
      retellingSeconds: 45,
    })

    expect(next.prosodySessions).toHaveLength(1)
    expect(next.recentProsodyIds).toEqual(['prosody_001'])
  })

})

describe('weekly test comparison', () => {
  const test = (weekKey: string) => ({
    id: `wt-${weekKey}`,
    weekKey,
    date: weekKey,
    topicId: 't001',
    durationMinutes: 3,
    startDelaySeconds: 2,
    longPauses: 3,
    majorFillers: 1,
    successfulParaphrases: 1,
    abandonedSentences: 1,
    longestFluentSegmentSeconds: 20,
    score: 3,
  })

  it('compares with the test closest to four weeks back, even if that week was skipped', () => {
    const tests = [test('2026-09-07'), test('2026-09-14'), test('2026-09-28')]
    expect(findComparisonTest(tests, '2026-10-12')?.weekKey).toBe('2026-09-14')
    expect(findComparisonTest([test('2026-09-07')], '2026-10-12')?.weekKey).toBe('2026-09-07')
    expect(findComparisonTest([test('2026-10-05')], '2026-10-12')).toBeNull()
  })
})
