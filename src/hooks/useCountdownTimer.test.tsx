import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdownTimer } from './useCountdownTimer'
import type { TimerSnapshot } from './useCountdownTimer'

describe('useCountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts down using wall-clock time', () => {
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 60 }),
    )

    act(() => result.current.start())
    expect(result.current.remainingSeconds).toBe(60)

    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(result.current.remainingSeconds).toBe(30)
    expect(result.current.status).toBe('running')
  })

  it('supports pause and resume without losing time', () => {
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 60 }),
    )

    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    act(() => result.current.pause())
    expect(result.current.status).toBe('paused')

    // Time passes while paused: the remaining time must not decrease.
    act(() => {
      vi.advanceTimersByTime(15_000)
    })
    expect(result.current.remainingSeconds).toBe(40)

    act(() => result.current.resume())
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current.remainingSeconds).toBe(30)
  })

  it('restores an in-flight snapshot after a refresh', () => {
    const snapshot: TimerSnapshot = {
      status: 'running',
      durationSeconds: 60,
      endAt: Date.now() + 20_000,
      remainingWhenPaused: null,
    }
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 60, snapshot }),
    )

    expect(result.current.status).toBe('running')
    expect(result.current.remainingSeconds).toBe(20)
  })

  it('restores an expired snapshot as finished', () => {
    const snapshot: TimerSnapshot = {
      status: 'running',
      durationSeconds: 60,
      endAt: Date.now() - 5_000,
      remainingWhenPaused: null,
    }
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 60, snapshot }),
    )

    expect(result.current.status).toBe('finished')
    expect(result.current.remainingSeconds).toBe(0)
  })

  it('fires the completion callback exactly once', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useCountdownTimer({ durationSeconds: 5, onComplete }),
    )

    act(() => result.current.start())
    act(() => {
      vi.advanceTimersByTime(6_000)
    })

    expect(result.current.status).toBe('finished')
    expect(onComplete).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
