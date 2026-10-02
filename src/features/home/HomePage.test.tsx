import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../../app/AppStateProvider'
import { createInitialState } from '../../types/progress'
import type { AppStateV1, SessionRecord } from '../../types/progress'
import { toLocalDateString } from '../../services/progress/progress'
import HomePage from './HomePage'

function renderHome(state?: AppStateV1) {
  return render(
    <AppStateProvider initialState={state}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </AppStateProvider>,
  )
}

function completedSession(): SessionRecord {
  const today = toLocalDateString()
  return {
    id: 's1',
    date: today,
    completedAt: new Date().toISOString(),
    durationMinutes: 30,
    blockCount: 2,
    fluencyScore: 4,
    successParaphrase: '',
    expressionToReuse: '',
    errorToWatch: '',
    topicId: 't001',
    questionIds: [],
    wordIds: [],
    expressionIds: [],
  }
}

describe('HomePage', () => {
  it('offers to start a session and lists the exercises', () => {
    renderHome()

    expect(
      screen.getByRole('link', { name: 'Commencer la session du jour' }),
    ).toBeInTheDocument()
    expect(screen.getByText('4 → 3 → 2')).toBeInTheDocument()
    expect(screen.getByText('Questions surprise')).toBeInTheDocument()
  })

  it('offers to resume when a session is in progress', () => {
    const state: AppStateV1 = {
      ...createInitialState(),
      inProgressSession: {} as AppStateV1['inProgressSession'],
    }
    renderHome(state)
    expect(
      screen.getByRole('link', { name: 'Reprendre la session' }),
    ).toBeInTheDocument()
  })

  it('shows aggregated stats', () => {
    const state: AppStateV1 = {
      ...createInitialState(),
      sessions: [completedSession()],
    }
    renderHome(state)
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('1/5')).toBeInTheDocument()
  })
})
