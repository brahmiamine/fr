import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../../app/AppStateProvider'
import { createInitialState } from '../../types/progress'
import type { AppStateV1, SessionRecord } from '../../types/progress'
import { toLocalDateString } from '../../services/progress/progress'
import ProgressPage from './ProgressPage'

function renderProgress(state?: AppStateV1) {
  return render(
    <AppStateProvider initialState={state}>
      <ProgressPage />
    </AppStateProvider>,
  )
}

function completedSession(): SessionRecord {
  const today = toLocalDateString()
  return {
    id: 's1',
    date: today,
    completedAt: new Date().toISOString(),
    durationMinutes: 28,
    blockCount: 4,
    fluencyScore: 3,
    successParaphrase: 'ambiance',
    expressionToReuse: '',
    errorToWatch: '',
    topicId: 't001',
    questionIds: [],
    wordIds: [],
    expressionIds: [],
  }
}

describe('ProgressPage', () => {
  it('shows an empty state without sessions', () => {
    renderProgress()
    expect(
      screen.getByText(/Aucune session terminée/),
    ).toBeInTheDocument()
  })

  it('lists completed sessions with their metrics', () => {
    const state: AppStateV1 = {
      ...createInitialState(),
      sessions: [completedSession()],
    }
    renderProgress(state)
    expect(screen.getByText(/28 min/)).toBeInTheDocument()
    expect(screen.getByText(/4 blocages/)).toBeInTheDocument()
    expect(screen.getByText(/Fluidité 3\/5/)).toBeInTheDocument()
  })

  it('always offers the weekly test section', () => {
    renderProgress()
    expect(
      screen.getByRole('heading', { name: 'Test hebdomadaire' }),
    ).toBeInTheDocument()
  })
})
