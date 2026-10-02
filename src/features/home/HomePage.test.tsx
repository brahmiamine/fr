import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../../app/AppStateProvider'
import { createInitialState } from '../../types/progress'
import type { AppState, SessionRecord } from '../../types/progress'
import { toLocalDateString } from '../../services/progress/progress'
import HomePage from './HomePage'

function renderHome(state?: AppState) {
  return render(
    <AppStateProvider initialState={state}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </AppStateProvider>,
  )
}

function completedSession(): SessionRecord {
  return {
    id: 's1',
    date: toLocalDateString(),
    completedAt: new Date().toISOString(),
    durationMinutes: 30,
    blockCount: 2,
    fluencyScore: 4,
    blockedWord: '',
    expressionToReuse: '',
    topicId: 't001',
    questionIds: [],
    chunkIds: [],
    genericWordIds: [],
    summary: { chunksWorked: 3, gapsPracticed: 5, questionsAsked: 5, fluencyDone: true },
  }
}

describe('HomePage', () => {
  it('offers to start a session and shows the core stats', () => {
    renderHome()

    expect(
      screen.getByRole('link', { name: 'Commencer ma séance' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Série actuelle')).toBeInTheDocument()
    expect(screen.getByText('Mots débloqués')).toBeInTheDocument()
    expect(screen.getByText('Chunks actifs')).toBeInTheDocument()
  })

  it('offers to resume with the current stage', () => {
    const state: AppState = {
      ...createInitialState(),
      inProgressSession: {} as AppState['inProgressSession'],
    }
    renderHome(state)
    expect(
      screen.getByRole('link', { name: /Reprendre ma séance/ }),
    ).toBeInTheDocument()
  })

  it('shows weekly progress and total time', () => {
    const state: AppState = {
      ...createInitialState(),
      sessions: [completedSession()],
    }
    renderHome(state)
    expect(screen.getByText('1/5')).toBeInTheDocument()
    expect(screen.getByText('30 min')).toBeInTheDocument()
  })
})
