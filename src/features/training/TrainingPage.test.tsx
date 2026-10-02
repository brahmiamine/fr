import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../../app/AppStateProvider'
import { contentRepository } from '../../services/content/contentRepository'
import { buildSessionContent } from '../../services/content/selectContent'
import { createInitialState, STORAGE_KEY } from '../../types/progress'
import type { AppStateV1 } from '../../types/progress'
import { createSessionState } from './sessionReducer'
import TrainingPage from './TrainingPage'

const content = buildSessionContent(
  contentRepository,
  { topicIds: [], questionIds: [], wordIds: [], expressionIds: [] },
  () => 0.5,
)

function renderTraining(initialState?: AppStateV1) {
  return render(
    <AppStateProvider initialState={initialState}>
      <MemoryRouter initialEntries={['/training']}>
        <TrainingPage />
      </MemoryRouter>
    </AppStateProvider>,
  )
}

describe('TrainingPage', () => {
  it('creates a new session and shows the first exercise', async () => {
    renderTraining()

    expect(
      screen.getByText('Manche 1 · 4 minutes'),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Ne t'arrête pas pour te corriger."),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy()
    })
  })

  it('resumes a persisted session after a refresh', () => {
    const persisted = {
      ...createSessionState(content, new Date('2026-10-02T10:00:00.000Z')),
      exerciseIndex: 1,
    }
    const state: AppStateV1 = {
      ...createInitialState(),
      inProgressSession: persisted,
    }

    renderTraining(state)

    expect(
      screen.getByRole('heading', { name: /Fais deviner/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(content.paraphraseWords[0].word),
    ).toBeInTheDocument()
  })

  it('completes the review and records a session', async () => {
    const user = userEvent.setup()
    const persisted = {
      ...createSessionState(content, new Date('2026-10-02T10:00:00.000Z')),
      phase: 'review' as const,
    }
    const state: AppStateV1 = {
      ...createInitialState(),
      inProgressSession: persisted,
    }

    renderTraining(state)

    await user.type(
      screen.getByLabelText(/Nombre de vrais blocages/),
      '3',
    )
    await user.selectOptions(
      screen.getByLabelText(/ressenti de fluidité/),
      '4',
    )
    await user.click(
      screen.getByRole('button', { name: 'Terminer la session' }),
    )

    expect(
      await screen.findByText(/Bravo, session terminée/),
    ).toBeInTheDocument()

    await waitFor(() => {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw as string)
      expect(parsed.sessions).toHaveLength(1)
      expect(parsed.inProgressSession).toBeNull()
    })
  })

  it('keeps the review submit disabled until required fields are valid', () => {
    const state: AppStateV1 = {
      ...createInitialState(),
      inProgressSession: {
        ...createSessionState(content, new Date('2026-10-02T10:00:00.000Z')),
        phase: 'review',
      },
    }
    renderTraining(state)
    expect(
      screen.getByRole('button', { name: 'Terminer la session' }),
    ).toBeDisabled()
  })
})
