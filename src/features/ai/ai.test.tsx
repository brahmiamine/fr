import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from '../../app/SettingsProvider'
import { AppStateProvider, useAppState } from '../../app/AppStateProvider'
import { createInitialState } from '../../types/progress'
import { rememberRecordingActivity } from '../../services/audio/speechActivity'
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

describe('comparison of the 4 → 3 → 2 rounds', () => {
  it('compares the rounds once each is transcribed and keeps the priority as a note', async () => {
    enableAi()
    // The rounds are transcribed one after the other, in order.
    const transcripts = [
      'euh je pense que le télétravail euh c’est bien parce que',
      'je pense que le télétravail c’est bien parce que on gagne du temps',
      'le télétravail c’est bien on gagne du temps',
      'la semaine de quatre jours ça dépend vraiment du métier',
    ]
    const tasks: Record<string, unknown>[] = []
    let transcribed = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.startsWith('blob:')) return { blob: async () => new Blob(['x']) } as unknown as Response
      if (url.endsWith('/api/transcribe')) {
        transcribed += 1
        return new Response(JSON.stringify({ text: transcripts[transcribed - 1], provider: 'groq' }))
      }
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>
      tasks.push(body)
      if (body.task === 'analyze-fluency') {
        return new Response(JSON.stringify({ provider: 'groq', data: { summary: 'Tour 1 analysé' } }))
      }
      return new Response(
        JSON.stringify({
          provider: 'groq',
          data: {
            summary: 'Moins d’hésitations, mais du contenu en moins',
            hesitations: 'better',
            restarts: 'same',
            continuity: 'better',
            contentKept: 'worse',
            recited: true,
            observations: ['Le tour 3 perd l’exemple'],
            transfer: 'Le transfert démarre vite',
            priority: 'Garde ton exemple même en 2 minutes',
          },
        }),
      )
    })
    let notes: string[] = []
    function Probe() {
      notes = useAppState().state.fluencyNotes.map((note) => `${note.kind}:${note.text}`)
      return null
    }
    const user = userEvent.setup()
    render(
      wrap(
        <AppStateProvider initialState={createInitialState()}>
          <FluencySummary
            recordings={{ 0: 'blob:c1', 1: 'blob:c2', 2: 'blob:c3', 3: 'blob:c4' }}
            topic="Télétravail ou bureau ?"
            transferTopic="La semaine de quatre jours ?"
            onContinue={() => undefined}
          />
          <Probe />
        </AppStateProvider>,
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Comparer mes tours' }))
    await waitFor(() => expect(screen.getByText('Garde ton exemple même en 2 minutes')).toBeInTheDocument())
    expect(screen.getByText(/réciter les mêmes phrases/)).toBeInTheDocument()
    const sent = tasks[0] as { task: string; input: { rounds: { label: string; transfer: boolean }[] } }
    expect(sent.task).toBe('compare-432')
    expect(sent.input.rounds.map((round) => round.transfer)).toEqual([false, false, false, true])

    // A round analysed afterwards reuses its transcript.
    await user.click(screen.getAllByRole('button', { name: "Analyser avec l'IA" })[0])
    expect(await screen.findByText('Tour 1 analysé')).toBeInTheDocument()
    expect(transcribed).toBe(4)

    await user.click(screen.getByRole('button', { name: 'Garder' }))
    expect(notes).toEqual(['fluencyPriority:Garde ton exemple même en 2 minutes'])
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
          providers: [{ id: 'groq', configured: true, model: 'm', transcribe: true }],
        }),
      ),
    )
    const user = userEvent.setup()
    render(wrap(<SettingsPage />))
    await user.click(screen.getByRole('switch', { name: "Activer l'intelligence artificielle" }))
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}').aiEnabled).toBe(true)
    expect(screen.getByLabelText('Fournisseur')).toBeInTheDocument()
    expect(await screen.findByText('Services disponibles :')).toBeInTheDocument()
    expect(screen.getByText('Groq', { selector: '.ai-service' })).toBeInTheDocument()
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
            blockages: [],
            missingWords: [],
            strategies: [],
            corrections: [{ said: "je suis d'accord avec toi", better: 'je partage ton avis' }],
            microExercise: '',
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
    // The transcript is tucked at the bottom, under the suggestions.
    expect(
      analysis.compareDocumentPosition(transcription) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(onUseCorrection).toHaveBeenCalledWith('je partage ton avis')
    expect(screen.getByRole('button', { name: 'Ajouté ✓' })).toBeDisabled()
  })

  it('coaches fluency: sends the measures and saves a missing word at once', async () => {
    enableAi()
    rememberRecordingActivity('blob:fluency', {
      startDelaySeconds: 1.2,
      longPauses: 3,
      longestSpeechSeconds: 12,
      speechRatio: 0.7,
      spokenSeconds: 60,
      longestPauseSeconds: 2.4,
    })
    const bodies: Record<string, unknown>[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.startsWith('blob:')) return { blob: async () => new Blob(['x']) } as unknown as Response
      if (url.endsWith('/api/transcribe')) {
        return new Response(
          JSON.stringify({ text: 'euh je… je pense que le, le truc pour payer, euh, en fait', provider: 'groq' }),
        )
      }
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>)
      return new Response(
        JSON.stringify({
          provider: 'groq',
          data: {
            summary: 'Tu continues malgré tout',
            blockages: [{ evidence: 'je… je pense', type: 'sentence_restart', strategy: 'Ne recommence pas.' }],
            missingWords: [{ word: 'échéance', idea: 'la date limite pour payer' }],
            strategies: [{ chunk: "Ce que je veux dire, c'est que…", use: 'continuer' }],
            corrections: [],
            microExercise: 'Refais 30 s sans recommencer une phrase.',
          },
        }),
      )
    })
    let gaps: string[] = []
    let chunks: string[] = []
    function Probe() {
      const { state } = useAppState()
      gaps = state.wordGaps.map((gap) => `${gap.target}|${gap.context}`)
      chunks = state.personalChunks.map((chunk) => chunk.expression)
      return null
    }
    const user = userEvent.setup()
    render(
      wrap(
        <AppStateProvider initialState={createInitialState()}>
          <AiAnalysisPanel audioUrl="blob:fluency" situation="question" />
          <Probe />
        </AppStateProvider>,
      ),
    )
    await user.click(screen.getByRole('button', { name: "Analyser avec l'IA" }))
    await waitFor(() => expect(screen.getByText('Ne recommence pas.')).toBeInTheDocument())
    expect(screen.getByText('Phrase recommencée')).toBeInTheDocument()
    expect(screen.getByText(/Refais 30 s/)).toBeInTheDocument()

    const sent = bodies[0] as { task: string; input: { situation: string; metrics: Record<string, number> } }
    expect(sent.task).toBe('analyze-fluency')
    expect(sent.input.situation).toBe('question')
    expect(sent.input.metrics).toMatchObject({ fillers: 2, markers: 1, restarts: 2, longPauses: 3, longestPauseSeconds: 2.4 })

    await user.click(screen.getByRole('button', { name: 'Ajouter à mes trous de mots' }))
    expect(gaps).toEqual(['échéance|la date limite pour payer'])
    await user.click(screen.getByRole('button', { name: 'Garder' }))
    expect(chunks).toEqual(["Ce que je veux dire, c'est que…"])
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
