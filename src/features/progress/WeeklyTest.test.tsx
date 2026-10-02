import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AppStateProvider } from '../../app/AppStateProvider'
import { createInitialState, STORAGE_KEY } from '../../types/progress'
import WeeklyTest from './WeeklyTest'

function renderWeeklyTest() {
  return render(
    <AppStateProvider initialState={createInitialState()}>
      <WeeklyTest />
    </AppStateProvider>,
  )
}

describe('WeeklyTest', () => {
  it('runs the test flow and persists the result', async () => {
    const user = userEvent.setup()
    renderWeeklyTest()

    await user.click(
      screen.getByRole('button', { name: 'Lancer le test de 3 minutes' }),
    )

    // The topic and timer are shown once the test starts.
    expect(screen.getByRole('timer')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: "J'ai terminé" }))
    expect(
      screen.getByRole('heading', { name: 'Mesures' }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Enregistrer le test' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Test de la semaine ✓' }),
    ).toBeInTheDocument()

    const raw = window.localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw as string).weeklyTests).toHaveLength(1)
  })
})
