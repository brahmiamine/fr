import {
  APP_STATE_VERSION,
  STORAGE_KEY,
  createInitialState,
} from '../../types/progress'
import type {
  AppStateV1,
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

/**
 * Normalise untrusted stored data into a valid V1 state. Unknown or malformed
 * fields fall back to their empty defaults instead of throwing so a corrupted
 * entry never blocks training.
 */
function normalizeState(raw: unknown): AppStateV1 {
  if (!isRecord(raw)) return createInitialState()

  const base = createInitialState()

  return {
    ...base,
    sessions: Array.isArray(raw.sessions)
      ? (raw.sessions as AppStateV1['sessions'])
      : base.sessions,
    weeklyTests: Array.isArray(raw.weeklyTests)
      ? (raw.weeklyTests as AppStateV1['weeklyTests'])
      : base.weeklyTests,
    nativeExpressionExamples: Array.isArray(raw.nativeExpressionExamples)
      ? (raw.nativeExpressionExamples as AppStateV1['nativeExpressionExamples'])
      : base.nativeExpressionExamples,
    recentTopicIds: asStringArray(raw.recentTopicIds),
    recentQuestionIds: asStringArray(raw.recentQuestionIds),
    recentWordIds: asStringArray(raw.recentWordIds),
    recentExpressionIds: asStringArray(raw.recentExpressionIds),
    inProgressSession: isRecord(raw.inProgressSession)
      ? (raw.inProgressSession as unknown as AppStateV1['inProgressSession'])
      : null,
  }
}

function parseStoredState(raw: string | null): AppStateV1 {
  if (!raw) return createInitialState()
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== APP_STATE_VERSION) {
      return createInitialState()
    }
    return normalizeState(parsed)
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
        "Le stockage local est indisponible : ta progression ne sera pas sauvegardée.",
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
        "Le stockage local est inaccessible : ta progression ne sera pas sauvegardée.",
    }
  }
}

export function saveAppState(
  state: AppStateV1,
  storage: StorageLike | null = getBrowserStorage(),
): SaveAppStateResult {
  if (!storage) {
    return {
      ok: false,
      warning:
        "Le stockage local est indisponible : ta progression reste en mémoire.",
    }
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return { ok: true }
  } catch {
    return {
      ok: false,
      warning:
        "Écriture impossible dans le stockage local : ta progression reste en mémoire.",
    }
  }
}

export { getBrowserStorage }
