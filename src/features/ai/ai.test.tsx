import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from '../../app/SettingsProvider'
import { MainNav } from '../../components/Layout/MainNav'
import { SETTINGS_KEY } from '../../services/settings/settings'
import SettingsPage from '../settings/SettingsPage'
import { AiAnalysisPanel } from './AiAnalysisPanel'
import { AiWordCheck } from './AiWordCheck'
import CoachPage from './CoachPage'
import { FluencySummary } from '../training/components/fluency/FluencySummary'

function enableAi() {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ aiEnabled: true }))
}

function wrap(node: React.ReactNode) {
  return (
    <MemoryRouter>
      <SettingsProvider>{node}</SettingsProvider>
    </MemoryRouter>
  )
}

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('AI off (default): the app is exactly as before', () => {
  it('shows no AI surface and sends nothing', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const { container } = render(
      wrap(
        <>
          <AiAnalysisPanel audioUrl="blob:x" />
          <AiWordCheck target="prise" context="le mur" />
        </>,
      ),
    )
    expect(container).toBeEmptyDOMElement()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('hides the Coach IA menu entry and sends the Coach page back to settings', () => {
    render(wrap(<MainNav />))
    expect(screen.queryByText('Coach IA')).toBeNull()
  })

  it('has the master switch off, without provider options', () => {
    render(wrap(<SettingsPage />))
    const toggle = screen.getByRole('switch', { name: "Activer l'intelligence artificielle" })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByLabelText('Fournisseur')).toBeNull()
  })

  it('redirects the Coach page', () => {
    render(
      <MemoryRouter initialEntries={['/coach']}>
        <SettingsProvider>
          <CoachPage />
        </SettingsProvider>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Coach IA')).toBeNull()
  })
})

describe('4 → 3 → 2 summary', () => {
  const recordings = { 0: 'blob:r1', 1: 'blob:r2' }

  it('offers no AI while it is off', () => {
    render(wrap(<FluencySummary recordings={recordings} onContinue={() => undefined} />))
    expect(screen.queryByRole('button', { name: "Analyser avec l'IA" })).toBeNull()
  })

  it('offers an analysis for each recorded round when on', () => {
    enableAi()
    render(wrap(<FluencySummary recordings={recordings} onContinue={() => undefined} />))
    expect(screen.getAllByRole('button', { name: "Analyser avec l'IA" })).toHaveLength(2)
  })
})

describe('AI on', () => {
  it('shows the menu entry', () => {
    enableAi()
    render(wrap(<MainNav />))
    expect(screen.getByText('Coach IA')).toBeInTheDocument()
  })

  it('persists the master switch and reveals the provider choice', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          accessRequired: false,
          accessOk: true,
          providers: [{ id: 'groq', configured: true, model: 'm', transcribe: true }],
        }),
      ),
    )
    const user = userEvent.setup()
    render(wrap(<SettingsPage />))
    await user.click(screen.getByRole('switch', { name: "Activer l'intelligence artificielle" }))
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}').aiEnabled).toBe(true)
    expect(screen.getByLabelText('Fournisseur')).toBeInTheDocument()
    expect(await screen.findByText(/Services disponibles : Groq/)).toBeInTheDocument()
  })

  it('transcribes, analyses and lets the learner pick a suggestion', async () => {
    enableAi()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.startsWith('blob:')) return { blob: async () => new Blob(['x']) } as unknown as Response
      if (url.endsWith('/api/transcribe')) {
        return new Response(JSON.stringify({ text: "euh je suis d'accord avec toi sur ce point", provider: 'groq' }))
      }
      return new Response(
        JSON.stringify({
          provider: 'groq',
          data: {
            summary: 'Bravo',
            corrections: [{ said: "je suis d'accord avec toi", better: 'je partage ton avis' }],
            expressions: [],
            blockedWord: null,
          },
        }),
      )
    })
    const onUseCorrection = vi.fn()
    const user = userEvent.setup()
    render(wrap(<AiAnalysisPanel audioUrl="blob:x" onUseCorrection={onUseCorrection} />))
    await user.click(screen.getByRole('button', { name: "Analyser avec l'IA" }))
    await waitFor(() => expect(screen.getByText('« je partage ton avis »')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Utiliser' }))
    const transcription = screen.getByText('Voir la transcription')
    const analysis = screen.getByRole('heading', { name: "Analyse par l'IA" })
    expect(
      transcription.compareDocumentPosition(analysis) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(onUseCorrection).toHaveBeenCalledWith('je partage ton avis')
    expect(screen.getByRole('button', { name: 'Ajouté ✓' })).toBeDisabled()
  })

  it('shows a readable message when the server is unreachable', async () => {
    enableAi()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    const user = userEvent.setup()
    render(wrap(<AiWordCheck target="prise" context="le mur" />))
    await user.type(screen.getByLabelText('Quel mot as-tu dit ?'), 'prise')
    await user.click(screen.getByRole('button', { name: "Vérifier avec l'IA" }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Impossible de joindre')
  })
})
