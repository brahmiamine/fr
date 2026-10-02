import { useCallback, useEffect, useRef, useState } from 'react'

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished'

export interface TimerSnapshot {
  status: TimerStatus
  durationSeconds: number
  /** Wall-clock timestamp (ms) when a running timer will finish. */
  endAt: number | null
  /** Remaining milliseconds frozen while paused. */
  remainingWhenPaused: number | null
}

export interface UseCountdownTimerOptions {
  durationSeconds: number
  snapshot?: TimerSnapshot | null
  onComplete?: () => void
  autoStart?: boolean
}

export interface CountdownTimer {
  remainingSeconds: number
  status: TimerStatus
  start: () => void
  pause: () => void
  resume: () => void
  reset: (seconds?: number) => void
  snapshot: TimerSnapshot
}

interface InitialTimerState {
  status: TimerStatus
  remainingMs: number
  endAt: number | null
}

function resolveInitialState(
  durationSeconds: number,
  snapshot: TimerSnapshot | null | undefined,
): InitialTimerState {
  if (!snapshot) {
    return { status: 'idle', remainingMs: durationSeconds * 1000, endAt: null }
  }

  if (snapshot.status === 'running' && snapshot.endAt !== null) {
    const remainingMs = snapshot.endAt - Date.now()
    if (remainingMs <= 0) {
      return { status: 'finished', remainingMs: 0, endAt: null }
    }
    return { status: 'running', remainingMs, endAt: snapshot.endAt }
  }

  if (snapshot.status === 'paused') {
    return {
      status: 'paused',
      remainingMs: snapshot.remainingWhenPaused ?? durationSeconds * 1000,
      endAt: null,
    }
  }

  if (snapshot.status === 'finished') {
    return { status: 'finished', remainingMs: 0, endAt: null }
  }

  return { status: 'idle', remainingMs: durationSeconds * 1000, endAt: null }
}

/**
 * Timestamp-based countdown. `Date.now()` is the source of truth so the timer
 * stays accurate across tab switches and device sleep; the interval only
 * triggers rerenders.
 */
export function useCountdownTimer({
  durationSeconds,
  snapshot,
  onComplete,
  autoStart = false,
}: UseCountdownTimerOptions): CountdownTimer {
  const initialRef = useRef<InitialTimerState | null>(null)
  if (initialRef.current === null) {
    initialRef.current = resolveInitialState(durationSeconds, snapshot)
  }
  const initial = initialRef.current

  const shouldAutoStart = autoStart && initial.status === 'idle'

  const [status, setStatus] = useState<TimerStatus>(
    shouldAutoStart ? 'running' : initial.status,
  )
  const [remainingMs, setRemainingMs] = useState(initial.remainingMs)
  const [endAt, setEndAt] = useState<number | null>(
    shouldAutoStart ? Date.now() + durationSeconds * 1000 : initial.endAt,
  )

  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const completedRef = useRef(initial.status === 'finished')

  const statusRef = useRef(status)
  const remainingRef = useRef(remainingMs)
  const endAtRef = useRef(endAt)
  useEffect(() => {
    statusRef.current = status
    remainingRef.current = remainingMs
    endAtRef.current = endAt
  }, [status, remainingMs, endAt])

  // Fire the completion callback exactly once when the timer reaches zero.
  useEffect(() => {
    if (status === 'finished' && !completedRef.current) {
      completedRef.current = true
      onCompleteRef.current?.()
    }
  }, [status])

  useEffect(() => {
    if (status !== 'running' || endAt === null) return

    const tick = () => {
      const next = endAt - Date.now()
      if (next <= 0) {
        setRemainingMs(0)
        setEndAt(null)
        setStatus('finished')
      } else {
        setRemainingMs(next)
      }
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [status, endAt])

  const start = useCallback(() => {
    completedRef.current = false
    const nextEnd = Date.now() + durationSeconds * 1000
    setEndAt(nextEnd)
    setRemainingMs(durationSeconds * 1000)
    setStatus('running')
  }, [durationSeconds])

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return
    const currentEnd = endAtRef.current
    const next =
      currentEnd !== null
        ? Math.max(0, currentEnd - Date.now())
        : remainingRef.current
    completedRef.current = false
    setRemainingMs(next)
    setEndAt(null)
    setStatus('paused')
  }, [])

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return
    const nextEnd = Date.now() + remainingRef.current
    setEndAt(nextEnd)
    setStatus('running')
  }, [])

  const reset = useCallback(
    (seconds?: number) => {
      const nextSeconds = seconds ?? durationSeconds
      completedRef.current = false
      setStatus('idle')
      setRemainingMs(nextSeconds * 1000)
      setEndAt(null)
    },
    [durationSeconds],
  )

  const currentRemainingMs =
    status === 'running' && endAt !== null
      ? Math.max(0, endAt - Date.now())
      : remainingMs

  return {
    remainingSeconds: Math.max(0, Math.ceil(currentRemainingMs / 1000)),
    status,
    start,
    pause,
    resume,
    reset,
    snapshot: {
      status,
      durationSeconds,
      endAt,
      remainingWhenPaused: status === 'paused' ? currentRemainingMs : null,
    },
  }
}
