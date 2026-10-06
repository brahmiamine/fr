import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../../app/AppStateProvider'
import { createInitialState, STORAGE_KEY } from '../../types/progress'
import ProsodyPage from './ProsodyPage'
import type { ProsodyExercise } from './types'

const exercise: ProsodyExercise = {
  id: 'prosody_test',
  level: 'B1',
  category: 'opinion',
  modelKind: 'recording',
  annotation: 'acoustic',
  audio: 'audio/prosody/prosody_test.wav',
  transcript: "Franchement, je pense que c'est une bonne idée, mais ça dépend.",
  groups: [
    { text: 'Franchement', start: 0, end: 2, intonation: 'level', intonationMeasured: true },
    { text: "je pense que c'est une bonne idée", start: 2, end: 7, intonation: 'rise', intonationMeasured: true },
    { text: 'mais ça dépend', start: 7, end: 12, intonation: 'fall', intonationMeasured: true },
  ],
  imitation: { start: 2, end: 9 },
  retelling: { idea: 'Donner une opinion positive puis la nuancer.' },
  ready: true,
  source: 'test',
  speaker: 'Locuteur test',
  style: 'interview',
}

describe('ProsodyPage', () => {
  it('saves the finished session and its plan, even in StrictMode', async () => {
    window.localStorage.clear()
    render(
      <StrictMode>
        <AppStateProvider initialState={createInitialState()}>
          <MemoryRouter>
            <ProsodyPage exercise={exercise} />
          </MemoryRouter>
        </AppStateProvider>
      </StrictMode>,
    )

    for (let step = 0; step < 3; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Passer cet exercice' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Passer et terminer' }))

    expect(await screen.findByRole('heading', { name: 'Séance prosodie terminée' })).toBeInTheDocument()
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
      expect(saved.prosodySessions).toHaveLength(1)
      expect(saved.prosodyPlans).toHaveLength(1)
      expect(saved.prosodyPlans[0].exerciseId).toBe('prosody_test')
      expect(saved.prosodySpeaker.name).toBe('Locuteur test')
    })
  })

  it('still saves the session when the learner leaves the page right away', async () => {
    window.localStorage.clear()
    const { unmount } = render(
      <AppStateProvider initialState={createInitialState()}>
        <MemoryRouter>
          <ProsodyPage exercise={exercise} />
        </MemoryRouter>
      </AppStateProvider>,
    )
    for (let step = 0; step < 3; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Passer cet exercice' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Passer et terminer' }))
    unmount()

    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
      expect(saved.prosodySessions).toHaveLength(1)
      expect(saved.prosodyPlans).toHaveLength(1)
    })
  })
})
