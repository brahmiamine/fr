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

    // A weekly benchmark must keep the same full 3-minute condition.
    expect(screen.getByRole('timer')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: "J'ai terminé" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mesures' })).not.toBeInTheDocument()
  })
})
