import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ConversationPrep, { interruptionTimes } from './ConversationPrep'

afterEach(() => {
  vi.useRealTimers()
})

describe('ConversationPrep', () => {
  it('spreads interruptions over the rehearsal', () => {
    expect(interruptionTimes(2, 120)).toEqual([40, 80])
  })

  it('shows a scenario and reveals interruptions while the learner speaks', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<ConversationPrep />)

    expect(screen.getByText(/Objectif :/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Répétition solo/ }))
    expect(screen.queryByText(/Interruption :/)).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(41_000)
    })
    expect(screen.getByText(/Interruption :/)).toBeInTheDocument()
  })
})
