import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Callout, Card, Eyebrow } from '../../components/ui'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import {
  aiErrorMessage,
  runAiTask,
  transcribeAudio,
} from '../../services/ai/client'
import { contentRepository } from '../../services/content/contentRepository'
import type { ConversationScenario } from '../../types/content'
import { AiAnalysisPanel } from './AiAnalysisPanel'
import { useAiEnabled } from './useAiEnabled'
import './ai.css'

type Mode = 'question' | 'roleplay'

function QuestionCoach() {
  const [theme, setTheme] = useState('')
  const [question, setQuestion] = useState('')
  const [previous, setPrevious] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const recorder = useAudioRecorder()

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      recorder.reset()
      const { data } = await runAiTask<{ text: string }>('question', {
        theme,
        avoid: previous.slice(-6),
      })
      setQuestion(data.text)
      setPrevious((prev) => [...prev, data.text])
    } catch (caught) {
      setError(aiErrorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <h2>Question surprise sur mesure</h2>
      <p className="muted">
        Génère une question, réponds à voix haute pendant environ une minute, puis fais
        analyser ta réponse.
      </p>
      <div className="field">
        <label htmlFor="coach-theme">Thème (facultatif)</label>
        <input
          id="coach-theme"
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
          placeholder="ex. travail, voyage, famille…"
          autoComplete="off"
        />
      </div>
      <Button block disabled={loading} onClick={() => void generate()}>
        {loading ? 'Génération…' : question ? 'Une autre question' : 'Générer une question'}
      </Button>
      {error ? <p role="alert" className="ai-error">{error}</p> : null}

      {question ? (
        <>
          <p className="ai-coach__question">{question}</p>
          {recorder.supported ? (
            recorder.status === 'recording' ? (
              <Button block variant="success" onClick={recorder.stop}>
                J'ai fini de répondre
              </Button>
            ) : (
              <Button block variant="accent-outline" onClick={() => void recorder.start()}>
                {recorder.blobUrl ? 'Refaire ma réponse' : 'Je réponds à voix haute'}
              </Button>
            )
          ) : (
            <p className="muted">L'enregistrement n'est pas disponible sur cet appareil.</p>
          )}
          {recorder.status === 'denied' ? (
            <p role="alert" className="ai-error">Accès au micro refusé.</p>
          ) : null}
          {recorder.status === 'stopped' ? <AiAnalysisPanel audioUrl={recorder.blobUrl} /> : null}
        </>
      ) : null}
    </Card>
  )
}

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

function pickScenario(exclude?: string): ConversationScenario | null {
  const pool = contentRepository.conversationScenarios.filter((item) => item.id !== exclude)
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

function RoleplayCoach() {
  const [scenario, setScenario] = useState<ConversationScenario | null>(() => pickScenario())
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [voice, setVoice] = useState(false)
  const recorder = useAudioRecorder()
  const lastTranscribed = useRef<string | null>(null)

  const ask = async (history: Turn[]) => {
    if (!scenario) return
    setBusy(true)
    setError('')
    try {
      const { data } = await runAiTask<{ text: string }>('roleplay', {
        situation: scenario.situation,
        goal: scenario.goal,
        events: scenario.events,
        history,
      })
      setTurns([...history, { role: 'assistant', content: data.text }])
    } catch (caught) {
      setError(aiErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  const start = (next: ConversationScenario | null) => {
    setScenario(next)
    setTurns([])
    setDraft('')
    setError('')
  }

  const send = () => {
    const content = draft.trim()
    if (!content || busy) return
    setDraft('')
    void ask([...turns, { role: 'user', content }])
  }

  // Voice answer: once recording stops, the transcript fills the draft for review.
  useEffect(() => {
    if (recorder.status !== 'stopped' || !recorder.blobUrl || !voice) return
    if (lastTranscribed.current === recorder.blobUrl) return
    lastTranscribed.current = recorder.blobUrl
    setVoice(false)
    setBusy(true)
    transcribeAudio(recorder.blobUrl)
      .then(({ text }) => setDraft(text))
      .catch((caught) => setError(aiErrorMessage(caught)))
      .finally(() => setBusy(false))
  }, [recorder.status, recorder.blobUrl, voice])

  if (!scenario) return null

  return (
    <Card>
      <h2>Jeu de rôle</h2>
      <Callout title="Situation">
        <p>{scenario.situation}</p>
        <p className="muted">Objectif : {scenario.goal}</p>
      </Callout>

      {turns.length === 0 ? (
        <>
          <Button block disabled={busy} onClick={() => void ask([])}>
            {busy ? 'Connexion…' : "Lancer la conversation"}
          </Button>
          <Button block variant="ghost" onClick={() => start(pickScenario(scenario.id))}>
            Autre situation
          </Button>
        </>
      ) : (
        <>
          <div className="ai-chat" aria-live="polite">
            {turns.map((turn, index) => (
              <p
                key={index}
                className={`ai-chat__bubble${turn.role === 'user' ? ' ai-chat__bubble--me' : ''}`}
              >
                {turn.content}
              </p>
            ))}
          </div>
          <div className="field">
            <label htmlFor="coach-answer">Ta réponse</label>
            <textarea
              id="coach-answer"
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={busy}
            />
          </div>
          <Button block disabled={busy || !draft.trim()} onClick={send}>
            {busy ? '…' : 'Envoyer'}
          </Button>
          {recorder.supported ? (
            recorder.status === 'recording' ? (
              <Button block variant="success" onClick={recorder.stop}>
                Terminer et transcrire
              </Button>
            ) : (
              <Button
                block
                variant="accent-outline"
                disabled={busy}
                onClick={() => {
                  setVoice(true)
                  void recorder.start()
                }}
              >
                Répondre à voix haute
              </Button>
            )
          ) : null}
          <Button block variant="ghost" onClick={() => start(pickScenario(scenario.id))}>
            Changer de situation
          </Button>
        </>
      )}
      {error ? <p role="alert" className="ai-error">{error}</p> : null}
    </Card>
  )
}

/** Free practice with AI: only reachable while the master switch is on. */
export default function CoachPage() {
  const enabled = useAiEnabled()
  const [mode, setMode] = useState<Mode>('question')

  if (!enabled) return <Navigate to="/settings" replace />

  return (
    <div className="page ai-coach">
      <header>
        <Eyebrow>Entraînement libre</Eyebrow>
        <h1>Coach IA</h1>
      </header>

      <div className="settings__segmented ai-coach__tabs" role="radiogroup" aria-label="Mode">
        {(
          [
            ['question', 'Question surprise'],
            ['roleplay', 'Jeu de rôle'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            className={`settings__option${mode === value ? ' is-active' : ''}`}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'question' ? <QuestionCoach /> : <RoleplayCoach />}
    </div>
  )
}
