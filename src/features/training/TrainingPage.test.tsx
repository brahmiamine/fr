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
    renderTraining({ ...createInitialState(), inProgressSession: session })
    expect(screen.getByText('Question suivante dans…')).toBeInTheDocument()
  })

  it('turns session difficulties into future learning material', async () => {
    const user = userEvent.setup()
    const session: TrainingSessionState = {
      ...createSessionState(plan, 2, new Date('2026-10-02T10:00:00.000Z')),
      stageIndex: 4,
      fluencyFeedback: {
        missingWord: 'prise électrique',
        missingWordContext: 'l’endroit dans le mur où je branche un appareil',
        difficultPhrase: 'phrase difficile',
        importantError: 'attention à depuis',
      },
      feedback: {
        blockedWord: '',
        blockedWordContext: '',
        abandonedSentence: 'phrase abandonnée',
        awkwardPhrase: 'formulation maladroite',
        expressionToReuse: "Ce que je veux dire, c'est que…",
        expressionIntent: 'Reformuler',
        blockCount: 3,
        fluencyScore: 4,
      },
    }
    renderTraining({ ...createInitialState(), inProgressSession: session })

    await user.click(screen.getByRole('button', { name: 'Terminer la séance' }))
    expect(await screen.findByRole('heading', { name: /Séance terminée/ })).toBeInTheDocument()

    await waitFor(() => {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
      const gap = parsed.wordGaps.find(
        (item: { target: string }) => item.target === 'prise électrique',
      )
      expect(gap.context).toContain('mur')
      expect(parsed.personalChunks).toHaveLength(1)
      expect(parsed.fluencyNotes.length).toBeGreaterThanOrEqual(4)
    })
  })

  it('keeps the submit disabled until feedback is valid', () => {
    const session: TrainingSessionState = {
      ...createSessionState(plan, 2, new Date('2026-10-02T10:00:00.000Z')),
      stageIndex: 4,
    }
    renderTraining({ ...createInitialState(), inProgressSession: session })
    expect(screen.getByRole('button', { name: 'Terminer la séance' })).toBeDisabled()
  })
})
