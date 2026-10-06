import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTINGS_KEY } from '../../services/settings/settings'
import { AppStateProvider } from '../../app/AppStateProvider'
import { SettingsProvider } from '../../app/SettingsProvider'
import { buildSessionPlan } from '../../services/review/selectPlan'
import { createInitialState, STORAGE_KEY } from '../../types/progress'
import type { AppState } from '../../types/progress'
import { createSessionState } from './sessionReducer'
import type { TrainingSessionState } from './types'
import TrainingPage from './TrainingPage'

const plan = buildSessionPlan(createInitialState(), () => 0.5)

function renderTraining(initialState?: AppState) {
  return render(
    <SettingsProvider>
      <AppStateProvider initialState={initialState}>
        <MemoryRouter initialEntries={['/training']}>
          <TrainingPage />
        </MemoryRouter>
      </AppStateProvider>
    </SettingsProvider>,
  )
}

describe('TrainingPage', () => {
  it('creates a new session on the chunks stage', async () => {
    renderTraining()
    expect(screen.getByText(/Chunk 1\/4/)).toBeInTheDocument()
    await waitFor(() => {
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy()
    })
  })

  it('resumes a persisted session at the current stage', () => {
    const session: TrainingSessionState = {
      ...createSessionState(plan, 2, new Date('2026-10-02T10:00:00.000Z')),
      stageIndex: 3,
      questions: { index: 0, stage: 'countdown' },
    }
    renderTraining({ ...createInitialState(), inProgressSession: session })
    expect(screen.getByText('Question suivante dans…')).toBeInTheDocument()
  })

  it('turns session difficulties into future learning material', async () => {
    const user = userEvent.setup()
    const session: TrainingSessionState = {
      ...createSessionState(plan, 2, new Date('2026-10-02T10:00:00.000Z')),
      stageIndex: 5,
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

  it('does not advance a prior correction unless the learner confirms using it', async () => {
    const user = userEvent.setup()
    const note = {
      id: 'note-1',
      kind: 'importantError' as const,
      text: 'Je suis arrivé il y a trois ans.',
      createdAt: '2026-10-01',
      nextReview: '2026-10-02',
      timesSeen: 0,
    }
    const session = {
      ...createSessionState(
        { ...plan, fluencyReminders: [note] },
        2,
        new Date('2026-10-02T10:00:00.000Z'),
      ),
      stageIndex: 5,
      usedFluencyReminderIds: [],
      feedback: {
        blockedWord: '',
        blockedWordContext: '',
        abandonedSentence: '',
        awkwardPhrase: '',
        expressionToReuse: '',
        expressionIntent: '',
        blockCount: 0,
        fluencyScore: 3,
      },
    } as TrainingSessionState & { usedFluencyReminderIds: string[] }

    renderTraining({
      ...createInitialState(),
      fluencyNotes: [note],
      inProgressSession: session,
    })

    await user.click(screen.getByRole('button', { name: 'Terminer la séance' }))

    await waitFor(() => {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
      expect(parsed.fluencyNotes[0].timesSeen).toBe(0)
    })
  })

  it('advances a prior correction after the learner confirms using it', async () => {
    const user = userEvent.setup()
    const note = {
      id: 'note-1',
      kind: 'importantError' as const,
      text: 'Je suis arrivé il y a trois ans.',
      createdAt: '2026-10-01',
      nextReview: '2026-10-02',
      timesSeen: 0,
    }
    const session = {
      ...createSessionState(
        { ...plan, fluencyReminders: [note] },
        2,
        new Date('2026-10-02T10:00:00.000Z'),
      ),
      stageIndex: 5,
      usedFluencyReminderIds: ['note-1'],
      feedback: {
        blockedWord: '',
        blockedWordContext: '',
        abandonedSentence: '',
        awkwardPhrase: '',
        expressionToReuse: '',
        expressionIntent: '',
        blockCount: 0,
        fluencyScore: 3,
      },
    } as TrainingSessionState & { usedFluencyReminderIds: string[] }

    renderTraining({
      ...createInitialState(),
      fluencyNotes: [note],
      inProgressSession: session,
    })

    await user.click(screen.getByRole('button', { name: 'Terminer la séance' }))

    await waitFor(() => {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
      expect(parsed.fluencyNotes[0].timesSeen).toBe(1)
    })
  })

  it('records the zapping questions and schedules a blocked question for J+3', async () => {
    const user = userEvent.setup()
    const session: TrainingSessionState = {
      ...createSessionState(plan, 3, new Date('2026-10-02T10:00:00.000Z')),
      stageIndex: 5,
      zapping: { stage: 'done', index: 4 },
      questionRatings: [{ questionId: plan.questions[0].id, rating: 'much' }],
      feedback: {
        blockedWord: '',
        blockedWordContext: '',
        abandonedSentence: '',
        awkwardPhrase: '',
        expressionToReuse: '',
        expressionIntent: '',
        blockCount: 0,
        fluencyScore: 3,
      },
    }

    renderTraining({ ...createInitialState(), inProgressSession: session })
    await user.click(screen.getByRole('button', { name: 'Terminer la séance' }))

    await waitFor(() => {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
      expect(parsed.sessions[0].questionIds).toEqual(
        [...plan.questions, ...plan.zappingQuestions].map((question) => question.id),
      )
      expect(parsed.sessions[0].summary.zappingDone).toBe(true)
      expect(parsed.questionReviews).toEqual([
        { questionId: plan.questions[0].id, nextReview: expect.any(String) },
      ])
    })
  })

  it('keeps the submit disabled until feedback is valid', () => {
    const session: TrainingSessionState = {
      ...createSessionState(plan, 2, new Date('2026-10-02T10:00:00.000Z')),
      stageIndex: 5,
    }
    renderTraining({ ...createInitialState(), inProgressSession: session })
    expect(screen.getByRole('button', { name: 'Terminer la séance' })).toBeDisabled()
  })

  describe('AI transfer subject', () => {
    const roundOne: TrainingSessionState = {
      ...createSessionState(plan, 2, new Date('2026-10-02T10:00:00.000Z')),
      stageIndex: 1,
      fluency: { roundIndex: 0, stage: 'running', keywords: [], recordAll: false },
    }

    beforeEach(() => window.localStorage.clear())
    afterEach(() => vi.restoreAllMocks())

    function reply(text: string) {
      return vi.spyOn(globalThis, 'fetch').mockImplementation(
        async () =>
          new Response(
            JSON.stringify({ data: { text }, provider: 'groq', model: 'm', usage: null, latencyMs: 1, failed: [] }),
          ),
      )
    }

    it('asks for it once the first round runs and stores it in the session', async () => {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ aiEnabled: true }))
      const fetchMock = reply('Ville ou campagne ?')
      renderTraining({ ...createInitialState(), inProgressSession: roundOne })

      await waitFor(() => {
        const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
        expect(saved.inProgressSession.fluency.transferPrompt).toBe('Ville ou campagne ?')
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('does nothing while the AI is off', async () => {
      const fetchMock = reply('Ville ou campagne ?')
      renderTraining({ ...createInitialState(), inProgressSession: roundOne })
      await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy())
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('keeps the written subject if the AI fails', async () => {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ aiEnabled: true }))
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 502 }))
      renderTraining({ ...createInitialState(), inProgressSession: roundOne })
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
      expect(saved.inProgressSession.fluency.transferPrompt).toBeUndefined()
    })

    it('shows the AI subject, flagged, before the transfer round', () => {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ aiEnabled: true }))
      reply('x')
      renderTraining({
        ...createInitialState(),
        inProgressSession: {
          ...roundOne,
          fluency: {
            roundIndex: 3,
            stage: 'ready',
            keywords: [],
            recordAll: false,
            transferPrompt: 'Ville ou campagne ?',
          },
        },
      })
      expect(screen.getByText('Ville ou campagne ?')).toBeInTheDocument()
      expect(screen.getByText(/Sujet proposé par l'IA/)).toBeInTheDocument()
    })
  })
})
