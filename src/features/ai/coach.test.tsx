import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from '../../app/SettingsProvider'
import { SETTINGS_KEY } from '../../services/settings/settings'
import { RoleplayChat } from './RoleplayChat'
import { SurpriseCoach } from './SurpriseCoach'

function wrap(node: React.ReactNode) {
  return (
    <MemoryRouter>
      <SettingsProvider>{node}</SettingsProvider>
    </MemoryRouter>
  )
}

let questionNumber = 0

beforeEach(() => {
  window.localStorage.clear()
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ aiEnabled: true }))
  questionNumber = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
    const body = JSON.parse(String(init?.body ?? '{}')) as { task?: string }
    if (body.task === 'question') {
      questionNumber += 1
      return new Response(
        JSON.stringify({
          provider: 'groq',
          model: 'm',
          data: { text: `Question numéro ${questionNumber} ?` },
          usage: null,
          latencyMs: 1,
          failed: [],
        }),
      )
    }
    return new Response(
      JSON.stringify({
        provider: 'groq',
        model: 'm',
        data: { text: 'Pourquoi êtes-vous en retard ?' },
        usage: null,
        latencyMs: 1,
        failed: [],
      }),
    )
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SurpriseCoach', () => {
  it('runs a timed series in the chosen theme and moves on to the next question', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(wrap(<SurpriseCoach />))

    await user.click(screen.getByRole('radio', { name: 'Voyage' }))
    await user.click(screen.getByRole('radio', { name: '30 s' }))
    await user.click(screen.getByRole('button', { name: 'Commencer' }))

    // The question stays hidden during the countdown.
    expect(screen.getByText('Question 1/5')).toBeInTheDocument()
    expect(screen.queryByText('Question numéro 1 ?')).toBeNull()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })
    expect(await screen.findByText('Question numéro 1 ?')).toBeInTheDocument()
    expect(screen.getByLabelText(/secondes restantes/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Question suivante/ }))
    expect(screen.getByText('Question 2/5')).toBeInTheDocument()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })
    expect(await screen.findByText('Question numéro 2 ?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Terminer' }))
    expect(screen.getByRole('heading', { name: 'Résumé' })).toBeInTheDocument()
  })

  it('moves on by itself when the answer time is over', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(wrap(<SurpriseCoach />))
    await user.click(screen.getByRole('radio', { name: '30 s' }))
    await user.click(screen.getByRole('button', { name: 'Commencer' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })
    await screen.findByText('Question numéro 1 ?')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31000)
    })
    expect(screen.getByText('Question 2/5')).toBeInTheDocument()
  })
})

describe('RoleplayChat audio', () => {
  it("offers to listen to the other person's message, not to your own", async () => {
    vi.stubGlobal('speechSynthesis', { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] })
    vi.stubGlobal('SpeechSynthesisUtterance', class {})
    const user = userEvent.setup()
    render(wrap(<RoleplayChat />))
    await screen.findByText('Pourquoi êtes-vous en retard ?')
    expect(screen.getAllByRole('button', { name: 'Écouter le message' })).toHaveLength(1)

    await user.type(screen.getByLabelText('Ton message'), 'Désolé')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))
    await waitFor(() => expect(screen.queryByLabelText('Écrit…')).toBeNull())
    expect(screen.getAllByRole('button', { name: 'Écouter le message' })).toHaveLength(2)
    vi.unstubAllGlobals()
  })
})

describe('RoleplayChat', () => {
  it('opens the conversation and shows a mic next to the text, turning into send once you type', async () => {
    vi.stubGlobal('MediaRecorder', class {})
    Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true })
    const user = userEvent.setup()
    render(wrap(<RoleplayChat />))
    expect(await screen.findByText('Pourquoi êtes-vous en retard ?')).toBeInTheDocument()

    // Same input bar: a mic when empty, a send button once there is text.
    await waitFor(() => expect(screen.queryByLabelText('Écrit…')).toBeNull())
    expect(screen.getByRole('button', { name: 'Message vocal' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Envoyer' })).toBeNull()
    await user.type(screen.getByLabelText('Ton message'), 'Désolé du retard')
    await user.click(screen.getByRole('button', { name: 'Envoyer' }))
    expect(screen.getByText('Désolé du retard')).toBeInTheDocument()
    expect(screen.getByLabelText('Ton message')).toHaveValue('')
    vi.unstubAllGlobals()
  })
})
