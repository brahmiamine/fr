import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Timer } from './Timer'

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
})
