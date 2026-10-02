import { createContext } from 'react'
import type { TimerSnapshot } from '../../hooks/useCountdownTimer'

/** Lets timers survive a page reload by keeping their snapshot in saved state. */
export interface TimerPersistence {
  get: (key: string) => TimerSnapshot | null
  save: (key: string, snapshot: TimerSnapshot | null) => void
}

export const TimerPersistenceContext = createContext<TimerPersistence | null>(null)
