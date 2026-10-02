import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../../app/AppStateProvider'
import { buildSessionPlan } from '../../services/review/selectPlan'
import { createInitialState, STORAGE_KEY } from '../../types/progress'
import type { AppState } from '../../types/progress'
import { createSessionState } from './sessionReducer'
import type { TrainingSessionState } from './types'
import TrainingPage from './TrainingPage'

const plan = buildSessionPlan(createInitialState(), () => 0.5)

function renderTraining(initialState?: AppState) {
  return render(
    <AppStateProvider initialState={initialState}>
      <MemoryRouter initialEntries={['/training']}>
        <TrainingPage />
      </MemoryRouter>
    </AppStateProvider>,
  )
}

describe('TrainingPage', () => {
  it('creates a new session on the chunks stage', async () => {
    renderTraining()

    expect(screen.getByText('Chunk 1/3')).toBeInTheDocument()
    expect(screen.getByText(/Chunks \+ récupération/)).toBeInTheDocument()

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy()
    })
  })

  it('resumes a persisted session at the current stage', () => {
    const session: TrainingSessionState = {
      ...createSessionState(plan, 2, new Date('2026-10-02T10:00:00.000Z')),
      stageIndex: 2,
      questions: { index: 0, stage: 'countdown' },
    }
    const state: AppState = { ...createInitialState(), inProgressSession: session }

    renderTraining(state)

    expect(
      screen.getByText('Question suivante dans…'),
    ).toBeInTheDocument()
  })

  it('records the session and adds a missing word to the gap bank on completion', async () => {
    const user = userEvent.setup()
    const session: TrainingSessionState = {
      ...createSessionState(plan, 2, new Date('2026-10-02T10:00:00.000Z')),
      stageIndex: 4,
      fluencyFeedback: {
        missingWord: 'prise électrique',
        difficultPhrase: '',
        importantError: '',
      },
      feedback: {
        blockedWord: '',
        expressionToReuse: '',
        blockCount: 3,
        fluencyScore: 4,
      },
    }
    const state: AppState = { ...createInitialState(), inProgressSession: session }

    renderTraining(state)

    await user.click(
      screen.getByRole('button', { name: 'Terminer la séance' }),
    )

    expect(await screen.findByText(/Séance terminée/)).toBeInTheDocument()

    await waitFor(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw as string)
      expect(parsed.sessions).toHaveLength(1)
      expect(parsed.inProgressSession).toBeNull()
      expect(parsed.wordGaps.some((gap: { target: string }) => gap.target === 'prise électrique')).toBe(
        true,
      )
    })
  })

  it('keeps the submit disabled until feedback is valid', () => {
    const session: TrainingSessionState = {
      ...createSessionState(plan, 2, new Date('2026-10-02T10:00:00.000Z')),
      stageIndex: 4,
    }
    renderTraining({ ...createInitialState(), inProgressSession: session })
    expect(
      screen.getByRole('button', { name: 'Terminer la séance' }),
    ).toBeDisabled()
  })
})
