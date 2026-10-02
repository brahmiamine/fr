import { LEGACY_STORAGE_KEY, STORAGE_KEY, createInitialState } from '../../types/progress'
import type {
  AppState,
  LoadAppStateResult,
  SaveAppStateResult,
  StorageLike,
} from '../../types/progress'

function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    const probe = '__fr_fluency_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function asNumberLevel(value: unknown): 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) return value
  return 1
}

function normalizeV3(raw: Record<string, unknown>): AppState {
  const base = createInitialState()
  return {
    ...base,
    sessions: Array.isArray(raw.sessions) ? (raw.sessions as AppState['sessions']) : [],
    weeklyTests: Array.isArray(raw.weeklyTests)
      ? (raw.weeklyTests as AppState['weeklyTests'])
      : [],
    conversationPractices: Array.isArray(raw.conversationPractices)
      ? (raw.conversationPractices as AppState['conversationPractices'])
      : [],
    wordGaps: Array.isArray(raw.wordGaps) ? (raw.wordGaps as AppState['wordGaps']) : [],
    chunkReviews: Array.isArray(raw.chunkReviews)
      ? (raw.chunkReviews as AppState['chunkReviews'])
      : [],
    personalExamples: Array.isArray(raw.personalExamples)
      ? (raw.personalExamples as AppState['personalExamples'])
      : [],
    personalChunks: Array.isArray(raw.personalChunks)
      ? (raw.personalChunks as AppState['personalChunks'])
      : [],
    fluencyNotes: Array.isArray(raw.fluencyNotes)
      ? (raw.fluencyNotes as AppState['fluencyNotes'])
      : [],
    recentTopicIds: asStringArray(raw.recentTopicIds),
    recentQuestionIds: asStringArray(raw.recentQuestionIds),
    recentWordIds: asStringArray(raw.recentWordIds),
    recentChunkIds: asStringArray(raw.recentChunkIds),
    level: asNumberLevel(raw.level),
    inProgressSession: isRecord(raw.inProgressSession)
      ? (raw.inProgressSession as unknown as AppState['inProgressSession'])
      : null,
  }
}

/**
 * V2 sessions remain valid, but its in-progress session did not contain the new
 * context/reuse fields. Restart only that unfinished session to avoid runtime
 * errors while preserving every completed learning record.
 */
function migrateV2(raw: Record<string, unknown>): AppState {
  const base = createInitialState()
  return {
    ...base,
    sessions: Array.isArray(raw.sessions) ? (raw.sessions as AppState['sessions']) : [],
    weeklyTests: Array.isArray(raw.weeklyTests)
      ? (raw.weeklyTests as AppState['weeklyTests'])
      : [],
    wordGaps: Array.isArray(raw.wordGaps) ? (raw.wordGaps as AppState['wordGaps']) : [],
    chunkReviews: Array.isArray(raw.chunkReviews)
      ? (raw.chunkReviews as AppState['chunkReviews'])
      : [],
    personalExamples: Array.isArray(raw.personalExamples)
      ? (raw.personalExamples as AppState['personalExamples'])
      : [],
    recentTopicIds: asStringArray(raw.recentTopicIds),
    recentQuestionIds: asStringArray(raw.recentQuestionIds),
    recentWordIds: asStringArray(raw.recentWordIds),
    recentChunkIds: asStringArray(raw.recentChunkIds),
    level: asNumberLevel(raw.level),
    inProgressSession: null,
  }
}

function migrateV1(raw: Record<string, unknown>): AppState {
  const base = createInitialState()
  return {
    ...base,
    sessions: Array.isArray(raw.sessions) ? (raw.sessions as AppState['sessions']) : [],
    weeklyTests: Array.isArray(raw.weeklyTests)
      ? (raw.weeklyTests as AppState['weeklyTests'])
      : [],
    personalExamples: Array.isArray(raw.nativeExpressionExamples)
      ? (raw.nativeExpressionExamples as AppState['personalExamples'])
      : [],
    recentTopicIds: asStringArray(raw.recentTopicIds),
    recentQuestionIds: asStringArray(raw.recentQuestionIds),
    recentWordIds: asStringArray(raw.recentWordIds),
    recentChunkIds: asStringArray(raw.recentExpressionIds),
    inProgressSession: null,
  }
}

function parseStoredState(raw: string | null): AppState {
  if (!raw) return createInitialState()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return createInitialState()
    if (parsed.version === 3) return normalizeV3(parsed)
    if (parsed.version === 2) return migrateV2(parsed)
    if (parsed.version === 1) return migrateV1(parsed)
    return createInitialState()
  } catch {
    return createInitialState()
  }
}

export function loadAppState(
  storage: StorageLike | null = getBrowserStorage(),
): LoadAppStateResult {
  if (!storage) {
    return {
      state: createInitialState(),
      available: false,
      warning:
        'Le stockage local est indisponible : ta progression ne sera pas sauvegardée.',
    }
  }

  try {
    const current = storage.getItem(STORAGE_KEY)
    if (current) {
      return { state: parseStoredState(current), available: true }
    }

    const legacy = storage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      const state = parseStoredState(legacy)
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(state))
        storage.removeItem(LEGACY_STORAGE_KEY)
      } catch {
        // Migration persistence is best-effort; keep the recovered state usable.
      }
      return { state, available: true }
    }

    return { state: createInitialState(), available: true }
  } catch {
    return {
      state: createInitialState(),
      available: false,
      warning:
        'Le stockage local est inaccessible : ta progression ne sera pas sauvegardée.',
    }
  }
}

export function saveAppState(
  state: AppState,
  storage: StorageLike | null = getBrowserStorage(),
): SaveAppStateResult {
  if (!storage) {
    return {
      ok: false,
      warning:
        'Le stockage local est indisponible : ta progression reste en mémoire.',
    }
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return { ok: true }
  } catch {
    return {
      ok: false,
      warning:
        'Écriture impossible dans le stockage local : ta progression reste en mémoire.',
    }
  }
}

export { getBrowserStorage }
