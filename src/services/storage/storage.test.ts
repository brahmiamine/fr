import { describe, expect, it } from 'vitest'
import { createInitialState, RECENT_WINDOWS, STORAGE_KEY } from '../../types/progress'
import type { AppStateV1, StorageLike } from '../../types/progress'
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

function stateWithSession(): AppStateV1 {
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
        successParaphrase: 'embouteillage',
        expressionToReuse: 'Ça dépend de…',
        errorToWatch: 'les temps',
        topicId: 't001',
        questionIds: ['q001'],
        wordIds: ['w001'],
        expressionIds: ['e001'],
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

  it('round-trips a valid V1 state', () => {
    const storage = memoryStorage()
    const state = stateWithSession()
    const saveResult = saveAppState(state, storage)
    expect(saveResult.ok).toBe(true)

    expect(storage.data.has(STORAGE_KEY)).toBe(true)
    const loaded = loadAppState(storage)
    expect(loaded.available).toBe(true)
    expect(loaded.state.sessions).toHaveLength(1)
    expect(loaded.state.recentTopicIds).toEqual(['t001'])
  })

  it('falls back to initial state on malformed JSON', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{ not json' })
    const loaded = loadAppState(storage)
    expect(loaded.state).toEqual(createInitialState())
  })

  it('falls back to initial state on an unknown version', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ version: 99, sessions: [{ id: 'x' }] }),
    })
    const loaded = loadAppState(storage)
    expect(loaded.state.version).toBe(1)
    expect(loaded.state.sessions).toEqual([])
  })

  it('normalises missing arrays without throwing', () => {
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ version: 1, recentTopicIds: 'nope' }),
    })
    const loaded = loadAppState(storage)
    expect(loaded.state.recentTopicIds).toEqual([])
    expect(loaded.state.sessions).toEqual([])
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

  it('exposes the recency windows used by the selector', () => {
    expect(RECENT_WINDOWS.topics).toBe(4)
    expect(RECENT_WINDOWS.questions).toBe(15)
    expect(RECENT_WINDOWS.words).toBe(15)
    expect(RECENT_WINDOWS.expressions).toBe(9)
  })
})
