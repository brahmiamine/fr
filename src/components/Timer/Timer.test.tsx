import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Timer } from './Timer'
import { TimerPersistenceContext } from './TimerPersistence'
import type { TimerPersistence } from './TimerPersistence'
import type { TimerSnapshot } from '../../hooks/useCountdownTimer'

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('formats the remaining time as MM:SS', () => {
    render(<Timer durationSeconds={65} hideControls />)
    expect(screen.getByRole('timer')).toHaveTextContent('01:05')
  })

  it('shows a start control and counts down when started', () => {
    render(<Timer durationSeconds={30} />)
    const start = screen.getByRole('button', { name: 'Démarrer' })
    act(() => start.click())

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(screen.getByRole('timer')).toHaveTextContent('00:29')
  })

  it('indicates completion', () => {
    render(<Timer durationSeconds={3} autoStart />)
    act(() => {
      vi.advanceTimersByTime(4_000)
    })
    expect(screen.getByText('Terminé')).toBeInTheDocument()
  })

  describe('persistence', () => {
    const makePersistence = () => {
      const store: Record<string, TimerSnapshot> = {}
      const persistence: TimerPersistence = {
        get: (key) => store[key] ?? null,
        save: (key, snapshot) => {
          if (snapshot) store[key] = snapshot
          else delete store[key]
        },
      }
      return { store, persistence }
    }

    it('resumes a running timer after a reload instead of restarting it', () => {
      const { store, persistence } = makePersistence()
      const tree = (
        <TimerPersistenceContext.Provider value={persistence}>
          <Timer persistKey="round" durationSeconds={240} autoStart hideControls />
        </TimerPersistenceContext.Provider>
      )
      const first = render(tree)
      act(() => {
        vi.advanceTimersByTime(155_000)
      })
      expect(store.round?.status).toBe('running')
      first.unmount()

      render(tree)
      expect(screen.getByRole('timer')).toHaveTextContent('01:25')
    })

    it('completes a timer that expired while the page was closed, once', () => {
      const onComplete = vi.fn()
      const { persistence } = makePersistence()
      persistence.save('round', {
        status: 'running',
        durationSeconds: 60,
        endAt: Date.now() - 1_000,
        remainingWhenPaused: null,
      })
      render(
        <TimerPersistenceContext.Provider value={persistence}>
          <Timer persistKey="round" durationSeconds={60} autoStart hideControls onComplete={onComplete} />
        </TimerPersistenceContext.Provider>,
      )
      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('forgets the snapshot once the timer finishes', () => {
      const { store, persistence } = makePersistence()
      render(
        <TimerPersistenceContext.Provider value={persistence}>
          <Timer persistKey="round" durationSeconds={3} autoStart hideControls />
        </TimerPersistenceContext.Provider>,
      )
      expect(store.round).toBeDefined()
      act(() => {
        vi.advanceTimersByTime(4_000)
      })
      expect(store.round).toBeUndefined()
    })
  })
})
