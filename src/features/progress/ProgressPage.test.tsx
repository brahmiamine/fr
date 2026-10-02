import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../../app/AppStateProvider'
import { createInitialState } from '../../types/progress'
import type { AppState, SessionRecord } from '../../types/progress'
import { toLocalDateString } from '../../services/progress/progress'
import ProgressPage from './ProgressPage'

function renderProgress(state?: AppState) {
  return render(
    <AppStateProvider initialState={state}>
      <ProgressPage />
    </AppStateProvider>,
  )
}

function completedSession(): SessionRecord {
  return {
    id: 's1',
    date: toLocalDateString(),
    completedAt: new Date().toISOString(),
    durationMinutes: 28,
    blockCount: 4,
    fluencyScore: 3,
    blockedWord: 'ambiance',
    expressionToReuse: '',
    topicId: 't001',
    questionIds: [],
    chunkIds: [],
    genericWordIds: [],
    summary: { chunksWorked: 3, gapsPracticed: 5, questionsAsked: 5, fluencyDone: true },
  }
}

describe('ProgressPage', () => {
  it('shows an empty state without sessions', () => {
    renderProgress()
    expect(screen.getByText(/Aucune session terminée/)).toBeInTheDocument()
  })

  it('lists completed sessions with their metrics', () => {
    renderProgress({ ...createInitialState(), sessions: [completedSession()] })
    expect(screen.getByText(/4 blocages/)).toBeInTheDocument()
    expect(screen.getByText(/Fluidité 3\/5/)).toBeInTheDocument()
    expect(screen.getByText(/Mot bloquant : ambiance/)).toBeInTheDocument()
    expect(screen.getAllByText(/28 min/).length).toBeGreaterThan(0)
  })

  it('always offers the weekly test section', () => {
    renderProgress()
    expect(
      screen.getByRole('heading', { name: 'Test de fluidité hebdomadaire' }),
    ).toBeInTheDocument()
  })
})
