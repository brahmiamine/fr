import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { loadAppState, saveAppState } from '../services/storage/storage'
import type { AppState } from '../types/progress'

export interface AppStateContextValue {
  state: AppState
  storageAvailable: boolean
  warning: string | null
  update: (next: AppState) => void
  updateWith: (fn: (prev: AppState) => AppState) => void
}

const AppStateContext = createContext<AppStateContextValue | null>(null)

export interface AppStateProviderProps {
  children: ReactNode
  /** Optional preloaded state, used by tests and the smoke flow. */
  initialState?: AppState
}

export function AppStateProvider({
  children,
  initialState,
}: AppStateProviderProps) {
  const loaded = useMemo(
    () => (initialState ? { state: initialState, available: true } : loadAppState()),
    [initialState],
  )

  const [state, setState] = useState<AppState>(loaded.state)
  const [warning, setWarning] = useState<string | null>(
    'warning' in loaded ? (loaded.warning ?? null) : null,
  )

  const stateRef = useRef(state)
  const applyState = useCallback((next: AppState) => {
    stateRef.current = next
    setState(next)
    const result = saveAppState(next)
    if (!result.ok && result.warning) setWarning(result.warning)
  }, [])

  const update = useCallback(
    (next: AppState) => applyState(next),
    [applyState],
  )

  const updateWith = useCallback(
    (fn: (prev: AppState) => AppState) => applyState(fn(stateRef.current)),
    [applyState],
  )

  const value = useMemo<AppStateContextValue>(
    () => ({
      state,
      storageAvailable: loaded.available,
      warning,
      update,
      updateWith,
    }),
    [state, loaded.available, warning, update, updateWith],
  )

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}

export function useAppState(): AppStateContextValue {
  const context = useContext(AppStateContext)
  if (!context) {
    throw new Error('useAppState doit être utilisé dans AppStateProvider.')
  }
  return context
}

/** Same as `useAppState`, or null outside the provider (stand-alone widgets). */
export function useOptionalAppState(): AppStateContextValue | null {
  return useContext(AppStateContext)
}
