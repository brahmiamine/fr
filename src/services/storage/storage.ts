import {
  STORAGE_KEY,
  createInitialState,
} from '../../types/progress'
import type {
  AppState,
  LoadAppStateResult,
  SaveAppStateResult,
  StorageLike,
} from '../../types/progress'

function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    // Probe access because some browsers throw on read when storage is blocked.
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
  return 2
}

/**
 * Normalise untrusted stored data into a valid V2 state. Unknown or malformed
 * fields fall back to their empty defaults instead of throwing so a corrupted
 * entry never blocks training.
 */
function normalizeV2(raw: Record<string, unknown>): AppState {
  const base = createInitialState()
  return {
    ...base,
    sessions: Array.isArray(raw.sessions)
      ? (raw.sessions as AppState['sessions'])
      : base.sessions,
    weeklyTests: Array.isArray(raw.weeklyTests)
      ? (raw.weeklyTests as AppState['weeklyTests'])
      : base.weeklyTests,
    wordGaps: Array.isArray(raw.wordGaps)
      ? (raw.wordGaps as AppState['wordGaps'])
      : base.wordGaps,
    chunkReviews: Array.isArray(raw.chunkReviews)
      ? (raw.chunkReviews as AppState['chunkReviews'])
      : base.chunkReviews,
    personalExamples: Array.isArray(raw.personalExamples)
      ? (raw.personalExamples as AppState['personalExamples'])
      : base.personalExamples,
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

/** Migrate an old V1 payload (pre-spaced-retrieval) into the V2 shape. */
function migrateV1(raw: Record<string, unknown>): AppState {
  const base = createInitialState()
  return {
    ...base,
    sessions: Array.isArray(raw.sessions)
      ? (raw.sessions as AppState['sessions'])
      : base.sessions,
    weeklyTests: Array.isArray(raw.weeklyTests)
      ? (raw.weeklyTests as AppState['weeklyTests'])
      : base.weeklyTests,
    personalExamples: Array.isArray(raw.nativeExpressionExamples)
      ? (raw.nativeExpressionExamples as AppState['personalExamples'])
      : base.personalExamples,
    recentTopicIds: asStringArray(raw.recentTopicIds),
    recentQuestionIds: asStringArray(raw.recentQuestionIds),
    recentWordIds: asStringArray(raw.recentWordIds),
    recentChunkIds: asStringArray(raw.recentExpressionIds),
    // The V1 in-progress session shape is incompatible; restart it.
    inProgressSession: null,
  }
}

function parseStoredState(raw: string | null): AppState {
  if (!raw) return createInitialState()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return createInitialState()

    if (parsed.version === 2) return normalizeV2(parsed)
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
    const raw = storage.getItem(STORAGE_KEY)
    return { state: parseStoredState(raw), available: true }
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
