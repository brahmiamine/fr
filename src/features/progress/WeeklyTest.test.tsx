import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

afterEach(() => {
  vi.useRealTimers()
})

describe('WeeklyTest', () => {
  it('does not allow the 3-minute benchmark to finish early', () => {
    renderWeeklyTest()

    fireEvent.click(
      screen.getByRole('button', { name: 'Lancer le test de 3 minutes' }),
    )

    expect(screen.getByRole('timer')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: "J'ai terminé" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mesures' })).not.toBeInTheDocument()
  })

  it('opens measurements only after 180 seconds and persists the result', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'))
    renderWeeklyTest()

    fireEvent.click(
      screen.getByRole('button', { name: 'Lancer le test de 3 minutes' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }))

    await act(async () => {
      vi.advanceTimersByTime(180_000)
    })

    expect(screen.getByRole('heading', { name: 'Mesures' })).toBeInTheDocument()

    fireEvent.click(
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
