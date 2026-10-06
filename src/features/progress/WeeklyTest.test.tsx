import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppStateProvider } from '../../app/AppStateProvider'
import { createInitialState, STORAGE_KEY } from '../../types/progress'
import WeeklyTest, { combineUnknown } from './WeeklyTest'

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

async function advance(seconds: number) {
  await act(async () => {
    vi.advanceTimersByTime(seconds * 1000)
  })
}

describe('WeeklyTest', () => {
  it('starts the known task immediately, without pause', async () => {
    vi.useFakeTimers()
    renderWeeklyTest()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Lancer le test' }))
    })

    expect(screen.getByText('1/3 · Tâche connue')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Mesures' })).not.toBeInTheDocument()
  })

  it('goes through the known task, three unknown questions and ten words, then saves', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'))
    renderWeeklyTest()

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Lancer le test' }))
    })
    await advance(180)
    for (let question = 0; question < 3; question += 1) {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Continuer' }))
      })
      expect(screen.getByText(`2/3 · Question inconnue ${question + 1}/3`)).toBeInTheDocument()
      await advance(90)
    }
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Continuer' }))
    })
    for (let word = 0; word < 10; word += 1) {
      expect(screen.getByText(`3/3 · Contournement ${word + 1}/10`)).toBeInTheDocument()
      if (word % 2 === 0) fireEvent.click(screen.getByRole('button', { name: 'Deviné' }))
      else await advance(20)
    }
    // First test: the native-language baseline is offered, and can be skipped.
    fireEvent.click(screen.getByRole('button', { name: 'Passer la référence L1' }))

    expect(screen.getByRole('heading', { name: 'Mesures' })).toBeInTheDocument()
    expect(screen.getByText('Mots contournés : 5/10')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Mots prononcés, tâche connue/), { target: { value: '300' } })
    fireEvent.change(screen.getByLabelText(/Mots prononcés, questions inconnues/), { target: { value: '360' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le test' }))

    expect(screen.getByRole('heading', { name: 'Test de la semaine ✓' })).toBeInTheDocument()

    const tests = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string).weeklyTests
    expect(tests).toHaveLength(1)
    expect(tests[0].successfulParaphrases).toBe(5)
    expect(tests[0].paraphraseAttempts).toBe(10)
    expect(tests[0].questionIds).toHaveLength(3)
    expect(tests[0].known.wordsPerMinute).toBe(100)
  })
})

describe('combineUnknown', () => {
  it('averages the start delay and weighs the mean pause by the number of pauses', () => {
    const activity = (startDelaySeconds: number, shortPauses: number, meanPauseSeconds: number) => ({
      startDelaySeconds,
      longPauses: 1,
      longestSpeechSeconds: 10 + startDelaySeconds,
      speechRatio: 0.8,
      shortPauses,
      meanPauseSeconds,
    })
    expect(combineUnknown([activity(1, 2, 0.5), activity(3, 6, 1), null])).toEqual({
      startDelaySeconds: 2,
      longPauses: 2,
      meanPauseSeconds: 0.88,
      longestSpeechSeconds: 13,
    })
    expect(combineUnknown([null])).toBeUndefined()
  })
})
