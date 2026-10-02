import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  LEGACY_STORAGE_KEY,
  RECENT_WINDOWS,
  STORAGE_KEY,
} from '../../types/progress'
import type { AppState, StorageLike } from '../../types/progress'
import { loadAppState, saveAppState } from './storage'

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Map<string, string>
} {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

function stateWithSession(): AppState {
  const state = createInitialState()
  return {
    ...state,
    recentTopicIds: ['t001'],
    sessions: [
      {
        id: 's1',
        date: '2026-10-02',
        completedAt: '2026-10-02T10:00:00.000Z',
        durationMinutes: 30,
        blockCount: 3,
        fluencyScore: 4,
        blockedWord: 'prise électrique',
        expressionToReuse: "D'un autre côté…",
        topicId: 't001',
        questionIds: ['q001'],
        chunkIds: ['chunk_001'],
        genericWordIds: ['w001'],
        summary: {
          chunksWorked: 3,
          gapsPracticed: 5,
          questionsAsked: 5,
          fluencyDone: true,
        },
      },
    ],
  }
}

describe('storage', () => {
  it('reports unavailable storage and returns usable in-memory state', () => {
    const result = loadAppState(null)
    expect(result.available).toBe(false)
    expect(result.warning).toBeTruthy()
    expect(result.state).toEqual(createInitialState())
  })

  it('round-trips a valid V4 state including prosody progress', () => {
    const storage = memoryStorage()
    const state: AppState = {
      ...stateWithSession(),
      prosodySessions: [
        {
          id: 'p1',
          exerciseId: 'prosody_001',
          date: '2026-10-02',
          completedAt: '2026-10-02T11:00:00.000Z',
          durationMinutes: 12,
          focus: 'pause',
          retellingSeconds: 45,
        },
      ],
      recentProsodyIds: ['prosody_001'],
    }
    expect(saveAppState(state, storage).ok).toBe(true)

    const loaded = loadAppState(storage)
    expect(loaded.available).toBe(true)
    expect(loaded.state.version).toBe(4)
    expect(loaded.state.sessions).toHaveLength(1)
    expect(loaded.state.prosodySessions).toHaveLength(1)
    expect(loaded.state.recentProsodyIds).toEqual(['prosody_001'])
  })

  it('migrates the legacy Fluidité storage key to Parle+ without losing progress', () => {
    const state = stateWithSession()
    const storage = memoryStorage({
      [LEGACY_STORAGE_KEY]: JSON.stringify(state),
    })

    const loaded = loadAppState(storage)

    expect(loaded.available).toBe(true)
    expect(loaded.state.sessions).toHaveLength(1)
    expect(storage.data.has(LEGACY_STORAGE_KEY)).toBe(false)
    expect(storage.data.get(STORAGE_KEY)).toBeTruthy()
  })

  it('migrates V3 to V4 without losing fluency progress', () => {
    const state = stateWithSession()
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        ...state,
        version: 3,
        prosodySessions: undefined,
        recentProsodyIds: undefined,
      }),
    })

    const loaded = loadAppState(storage)
    expect(loaded.state.version).toBe(4)
    expect(loaded.state.sessions).toHaveLength(1)
    expect(loaded.state.prosodySessions).toEqual([])
    expect(loaded.state.recentProsodyIds).toEqual([])
  })

  it('migrates V2 data and restarts only the incompatible in-progress session', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 2,
        sessions: stateWithSession().sessions,
        weeklyTests: [],
        wordGaps: [],
        chunkReviews: [],
        personalExamples: [],
        recentTopicIds: ['t001'],
        recentQuestionIds: [],
        recentWordIds: [],
        recentChunkIds: [],
        level: 2,
        inProgressSession: { old: 'shape' },
      }),
    })
    const loaded = loadAppState(storage)
    expect(loaded.state.version).toBe(4)
    expect(loaded.state.sessions).toHaveLength(1)
    expect(loaded.state.personalChunks).toEqual([])
    expect(loaded.state.fluencyNotes).toEqual([])
    expect(loaded.state.inProgressSession).toBeNull()
  })

  it('falls back to initial state on malformed JSON', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{ not json' })
    expect(loadAppState(storage).state).toEqual(createInitialState())
  })

  it('falls back on an unknown version', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ version: 99, sessions: [{ id: 'x' }] }),
    })
    const loaded = loadAppState(storage)
    expect(loaded.state.version).toBe(4)
    expect(loaded.state.sessions).toEqual([])
  })

  it('migrates a V1 payload into the V4 shape', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({
        version: 1,
        sessions: [],
        weeklyTests: [],
        recentTopicIds: ['t001'],
        recentQuestionIds: ['q001'],
        recentWordIds: ['w001'],
        recentExpressionIds: ['e001'],
        nativeExpressionExamples: [],
        inProgressSession: { old: 'shape' },
      }),
    })
    const loaded = loadAppState(storage)
    expect(loaded.state.version).toBe(4)
    expect(loaded.state.recentChunkIds).toEqual(['e001'])
    expect(loaded.state.wordGaps).toEqual([])
    expect(loaded.state.chunkReviews).toEqual([])
    expect(loaded.state.prosodySessions).toEqual([])
    expect(loaded.state.inProgressSession).toBeNull()
  })

  it('returns a warning instead of throwing when setItem fails', () => {
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => undefined,
    }
    const result = saveAppState(createInitialState(), storage)
    expect(result.ok).toBe(false)
    expect(result.warning).toBeTruthy()
  })

  it('exposes the recency windows', () => {
    expect(RECENT_WINDOWS.topics).toBe(4)
    expect(RECENT_WINDOWS.questions).toBe(15)
    expect(RECENT_WINDOWS.words).toBe(15)
    expect(RECENT_WINDOWS.chunks).toBe(9)
    expect(RECENT_WINDOWS.prosody).toBe(3)
  })
})
