import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEY } from '../types/progress'

describe('smoke: full hash-routing journey', () => {
  it('starts a session from home and reaches the training view', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(
      screen.getByRole('link', { name: 'Commencer ma séance' }),
    )

    // First stage of the guided session is chunks retrieval.
    expect(screen.getByText(/Chunk 1\/4/)).toBeInTheDocument()
    // Training hides the global navigation.
    expect(
      screen.queryByRole('link', { name: 'Progression' }),
    ).not.toBeInTheDocument()

    // The in-progress session is persisted for refresh recovery.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy()
  })

  it('lets the learner abandon a session in progress and start a new one', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const first = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      screen.queryByRole('button', { name: 'Commencer une nouvelle séance' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Commencer ma séance' }))
    const firstSessionId = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '{}',
    ).inProgressSession?.sessionId
    expect(firstSessionId).toBeTruthy()
    first.unmount()

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: /Reprendre ma séance/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Commencer une nouvelle séance' }))

    expect(screen.getByText(/Chunk 1\/4/)).toBeInTheDocument()
    const secondSessionId = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '{}',
    ).inProgressSession?.sessionId
    expect(secondSessionId).toBeTruthy()
    expect(secondSessionId).not.toBe(firstSessionId)
  })
})
