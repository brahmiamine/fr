import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { SpeakButton } from '../../components/Speech/SpeakButton'
import { Icon, WaveBars } from '../../components/ui'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import {
  aiErrorMessage,
  runAiTask,
  transcribeAudio,
} from '../../services/ai/client'
import { contentRepository } from '../../services/content/contentRepository'
import type { ConversationScenario } from '../../types/content'
import './ai.css'

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

function pickScenario(exclude?: string): ConversationScenario | null {
  const pool = contentRepository.conversationScenarios.filter((item) => item.id !== exclude)
  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

/** A role-play shaped like a messaging app: bubbles, one input bar, a mic next to the text. */
export function RoleplayChat() {
  const [scenario, setScenario] = useState<ConversationScenario | null>(() => pickScenario())
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const recorder = useAudioRecorder()
  const voiceRef = useRef(false)
  const lastTranscribed = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const openedFor = useRef<string | null>(null)

  const ask = async (current: ConversationScenario, history: Turn[]) => {
    setBusy(true)
    setError('')
    try {
      const { data } = await runAiTask<{ text: string }>('roleplay', {
        situation: current.situation,
        goal: current.goal,
        events: current.events,
        history,
      })
      setTurns([...history, { role: 'assistant', content: data.text }])
    } catch (caught) {
      setError(aiErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  // The other person opens the conversation, as soon as a situation is chosen.
  useEffect(() => {
    if (!scenario || openedFor.current === scenario.id) return
    openedFor.current = scenario.id
    void ask(scenario, [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [turns, busy])

  // A voice message: once the recording stops, it is transcribed and sent straight away.
  useEffect(() => {
    if (recorder.status !== 'stopped' || !recorder.blobUrl || !voiceRef.current) return
    if (lastTranscribed.current === recorder.blobUrl) return
    if (!scenario) return
    lastTranscribed.current = recorder.blobUrl
    voiceRef.current = false
    setBusy(true)
    setError('')
    transcribeAudio(recorder.blobUrl)
      .then(({ text }) => {
        const content = text.trim()
        if (!content) {
          setBusy(false)
          return
        }
        return ask(scenario, [...turns, { role: 'user', content }])
      })
      .catch((caught) => {
        setError(aiErrorMessage(caught))
        setBusy(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.status, recorder.blobUrl])

  const changeScenario = () => {
    const next = pickScenario(scenario?.id)
    setTurns([])
    setDraft('')
    setError('')
    setScenario(next)
  }

  const send = () => {
    const content = draft.trim()
    if (!content || busy || !scenario) return
    setDraft('')
    void ask(scenario, [...turns, { role: 'user', content }])
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      send()
    }
  }

  const toggleMic = () => {
    if (recorder.status === 'recording') {
      recorder.stop()
    } else {
      voiceRef.current = true
      void recorder.start()
    }
  }

  if (!scenario) return null

  const recording = recorder.status === 'recording'
  const showSend = draft.trim().length > 0 && !recording

  return (
    <>
      <section className="ai-chatbox" aria-label="Jeu de rôle">
        <header className="ai-chatbox__head">
          <div className="ai-chatbox__who">
            <span className="ai-chatbox__avatar" aria-hidden="true">
              <Icon name="chat" size={22} strokeWidth={2} />
              <span className="ai-chatbox__online" />
            </span>
            <div>
              <p className="ai-chatbox__situation">{scenario.situation}</p>
              <p className="muted">Objectif : {scenario.goal}</p>
            </div>
          </div>
          <button type="button" className="ai-chatbox__other" onClick={changeScenario}>
            Autre situation
          </button>
        </header>

        <div className="ai-chatbox__messages" ref={listRef} aria-live="polite">
          {turns.map((turn, index) =>
            turn.role === 'assistant' ? (
              <div key={index} className="ai-chat__row">
                <p className="ai-chat__bubble">{turn.content}</p>
                <SpeakButton
                  text={turn.content}
                  label="Écouter"
                  ariaLabel="Écouter le message"
                  compact
                  iconOnly
                />
              </div>
            ) : (
              <p key={index} className="ai-chat__bubble ai-chat__bubble--me">
                {turn.content}
              </p>
            ),
          )}
          {busy ? (
            <p className="ai-chat__bubble ai-chat__typing" aria-label="Écrit…">
              <span /><span /><span />
            </p>
          ) : null}
        </div>

        {error ? <p role="alert" className="ai-error ai-chatbox__error">{error}</p> : null}
        {recording ? (
          <div className="ai-chatbox__rec">
            <span className="rec-badge__dot" aria-hidden="true" />
            Enregistrement… touche ■ pour terminer
            <WaveBars count={5} height={18} tone="accent" speed={0.9} fluid />
          </div>
        ) : null}

        <div className="ai-chatbox__composer">
          <textarea
            aria-label="Ton message"
            rows={1}
            placeholder="Écris ton message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={recording}
          />
          {showSend || !recorder.supported ? (
            <button
              type="button"
              className="ai-chatbox__action"
              aria-label="Envoyer"
              disabled={busy || !draft.trim()}
              onClick={send}
            >
              <Icon name="send" size={20} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              className={`ai-chatbox__action${recording ? ' is-recording' : ''}`}
              aria-label={recording ? 'Terminer le message vocal' : 'Message vocal'}
              disabled={busy && !recording}
              onClick={toggleMic}
            >
              <Icon name={recording ? 'stop' : 'mic'} size={20} strokeWidth={2} />
            </button>
          )}
        </div>
      </section>
      <p className="muted ai-chatbox__hint">
        Entrée pour envoyer. Avec le micro, ton message vocal est envoyé dès que tu termines
        l'enregistrement.
      </p>
    </>
  )
}
