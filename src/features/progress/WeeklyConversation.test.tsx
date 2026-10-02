import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../../app/AppStateProvider'
import { createInitialState, STORAGE_KEY } from '../../types/progress'
import WeeklyConversation from './WeeklyConversation'

describe('WeeklyConversation', () => {
  it('requires at least 20 minutes of real interaction', async () => {
    const user = userEvent.setup()
    render(
      <AppStateProvider initialState={createInitialState()}>
        <WeeklyConversation />
      </AppStateProvider>,
    )

    const duration = screen.getByLabelText(/Durée réelle/)
    await user.clear(duration)
    await user.type(duration, '10')
    expect(
      screen.getByRole('button', { name: 'Enregistrer la conversation' }),
    ).toBeDisabled()
  })

  it('records real interaction and turns its difficulties into future practice', async () => {
    const user = userEvent.setup()
    render(
      <AppStateProvider initialState={createInitialState()}>
        <WeeklyConversation />
      </AppStateProvider>,
    )

    await user.type(screen.getByLabelText(/Un mot qui t'a manqué/), 'prise électrique')
    await user.type(
      screen.getByLabelText(/Quelle idée voulais-tu exprimer/),
      'l’endroit dans le mur où je branche un appareil',
    )
    await user.type(
      screen.getByLabelText(/formulation corrigée veux-tu réutiliser/),
      'je me suis arrêté au milieu de ma phrase',
    )
    await user.type(
      screen.getByLabelText(/Une expression utile/),
      'En revanche…',
    )
    await user.type(screen.getByLabelText(/À quoi sert cette expression/), 'Opposer une idée')

    await user.click(screen.getByRole('button', { name: 'Enregistrer la conversation' }))

    expect(
      screen.getByRole('heading', { name: 'Vraie conversation de la semaine ✓' }),
    ).toBeInTheDocument()

    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string)
    expect(parsed.conversationPractices).toHaveLength(1)
    expect(parsed.wordGaps[0].context).toContain('mur')
    expect(parsed.personalChunks[0].expression).toBe('En revanche…')
    expect(parsed.fluencyNotes[0].kind).toBe('conversationBlock')
  })
})
