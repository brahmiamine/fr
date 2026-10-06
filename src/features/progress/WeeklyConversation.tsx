import { InfoButton } from '../../components/ui'
import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useAppState } from '../../app/AppStateProvider'
import { AudioClip } from '../../components/AudioClip/AudioClip'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { aiErrorMessage, transcribeAudio } from '../../services/ai/client'
import {
  captureWordGap,
  conversationsThisWeek,
  getWeekKey,
  recordConversationPractice,
  toLocalDateString,
  upsertFluencyNote,
  upsertPersonalChunk,
} from '../../services/progress/progress'
import { CONVERSATIONS_PER_WEEK } from '../../types/progress'
import type { ConversationPractice } from '../../types/progress'
import { useAiEnabled } from '../ai/useAiEnabled'

/** The instructions to give to the partner before the conversation. */
export const PARTNER_INSTRUCTIONS = [
  'Ne me corrige pas pendant que je parle.',
  'Note 5 reformulations à me donner à la fin.',
  'Change brusquement de sujet 2 ou 3 fois.',
]

function toCount(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : undefined
}

let practiceCounter = 0

/**
 * Real conversation, 2 to 3 times a week: 20–30 minutes with a person (or a
 * voice AI), then the hardest minute is transcribed and rewritten, and every
 * difficulty goes back into the training.
 */
export default function WeeklyConversation() {
  const { state, updateWith } = useAppState()
  const done = conversationsThisWeek(state.conversationPractices)
  const aiEnabled = useAiEnabled()
  const recorder = useAudioRecorder()

  const [saved, setSaved] = useState(false)
  const [duration, setDuration] = useState('20')
  const [reformulations, setReformulations] = useState('')
  const [missingWord, setMissingWord] = useState('')
  const [missingWordContext, setMissingWordContext] = useState('')
  const [blockingMoment, setBlockingMoment] = useState('')
  const [expressionToReuse, setExpressionToReuse] = useState('')
  const [expressionIntent, setExpressionIntent] = useState('')
  const [minuteUrl, setMinuteUrl] = useState<string | null>(null)
  const [transcribedMinute, setTranscribedMinute] = useState('')
  const [rewrittenMinute, setRewrittenMinute] = useState('')
  const [midClausePauses, setMidClausePauses] = useState('')
  const [abandonedSentences, setAbandonedSentences] = useState('')
  const [transcription, setTranscription] = useState<{ status: 'idle' | 'loading' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  })

  const minuteAudio = minuteUrl ?? recorder.blobUrl

  const durationMinutes = Number(duration)
  const valid =
    Number.isFinite(durationMinutes) &&
    durationMinutes >= 20 &&
    (!missingWord.trim() || Boolean(missingWordContext.trim())) &&
    (!expressionToReuse.trim() || Boolean(expressionIntent.trim()))

  const importMinute = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setMinuteUrl(URL.createObjectURL(file))
  }

  const transcribeMinute = async () => {
    if (!minuteAudio) return
    setTranscription({ status: 'loading', message: '' })
    try {
      const { text } = await transcribeAudio(minuteAudio)
      setTranscribedMinute(text)
      setTranscription({ status: 'idle', message: '' })
    } catch (caught) {
      setTranscription({ status: 'error', message: aiErrorMessage(caught) })
    }
  }

  const reset = () => {
    setDuration('20')
    setReformulations('')
    setMissingWord('')
    setMissingWordContext('')
    setBlockingMoment('')
    setExpressionToReuse('')
    setExpressionIntent('')
    setMinuteUrl(null)
    setTranscribedMinute('')
    setRewrittenMinute('')
    setMidClausePauses('')
    setAbandonedSentences('')
    recorder.reset()
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    const now = new Date()
    practiceCounter += 1
    const lines = reformulations
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    const practice: ConversationPractice = {
      id: `conversation-${now.getTime()}-${practiceCounter}`,
      weekKey: getWeekKey(now),
      date: toLocalDateString(now),
      durationMinutes,
      missingWord: missingWord.trim(),
      missingWordContext: missingWordContext.trim(),
      blockingMoment: blockingMoment.trim(),
      expressionToReuse: expressionToReuse.trim(),
      expressionIntent: expressionIntent.trim(),
      ...(transcribedMinute.trim() ? { transcribedMinute: transcribedMinute.trim() } : {}),
      ...(rewrittenMinute.trim() ? { rewrittenMinute: rewrittenMinute.trim() } : {}),
      ...(toCount(midClausePauses) !== undefined ? { midClausePauses: toCount(midClausePauses) } : {}),
      ...(toCount(abandonedSentences) !== undefined ? { abandonedSentences: toCount(abandonedSentences) } : {}),
      ...(lines.length > 0 ? { reformulations: lines } : {}),
    }

    updateWith((prev) => {
      let next = recordConversationPractice(prev, practice)
      next = captureWordGap(next, practice.missingWord, practice.missingWordContext, now)
      next = upsertFluencyNote(next, 'conversationBlock', practice.blockingMoment, now)
      for (const line of lines) next = upsertFluencyNote(next, 'conversationBlock', line, now)
      next = upsertPersonalChunk(next, practice.expressionToReuse, practice.expressionIntent, now)
      return next
    })
    reset()
    setSaved(true)
  }

  return (
    <section className="card weekly-test" aria-labelledby="conversation-title">
      <div className="title-row">
        <h2 id="conversation-title">Vraie conversation</h2>
        <InfoButton id="conversation" />
      </div>
      <p className="pill">
        Cette semaine : {done}/{CONVERSATIONS_PER_WEEK.min}–{CONVERSATIONS_PER_WEEK.max}
        {done >= CONVERSATIONS_PER_WEEK.min ? ' ✓' : ''}
      </p>
      {saved ? (
        <p className="success-banner" role="status">
          Conversation enregistrée ✓ Ses difficultés sont réinjectées dans l'entraînement.
        </p>
      ) : null}
      <p className="muted">
        2 à 3 fois par semaine, parle 20–30 minutes avec une vraie personne (ou une
        IA vocale). Les monologues entraînent le moteur ; la conversation vérifie
        les interruptions, les clarifications et les réponses immédiates. Ces
        jours-là, fais la séance « Jour de conversation » (chunks + 4 → 3 → 2).
      </p>

      <div className="exercise__rescue">
        <h3>Consigne à donner à ton partenaire</h3>
        <ul>
          {PARTNER_INSTRUCTIONS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="muted">Et enregistre la conversation.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="conversation-duration">Durée réelle (minutes)</label>
          <input
            id="conversation-duration"
            type="number"
            min={20}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="conversation-reformulations">
            Les reformulations de ton partenaire (une par ligne)
          </label>
          <textarea
            id="conversation-reformulations"
            rows={3}
            value={reformulations}
            onChange={(event) => setReformulations(event.target.value)}
          />
        </div>

        <fieldset className="exercise__rescue">
          <legend>La minute la plus difficile</legend>
          <p className="muted">
            Choisis la minute où tu as le plus bloqué. Transcris-la, marque les
            pauses, les phrases abandonnées et les mots cherchés, puis réécris-la
            avec les reformulations.
          </p>
          <div className="stack">
            {recorder.supported ? (
              <button
                type="button"
                className="button button--ghost button--block"
                onClick={() => {
                  setMinuteUrl(null)
                  if (recorder.status === 'recording') recorder.stop()
                  else void recorder.start()
                }}
              >
                {recorder.status === 'recording' ? 'Arrêter' : 'Enregistrer (ou rejouer) cette minute'}
              </button>
            ) : null}
            <label className="button button--subtle button--block">
              Importer l'enregistrement
              <input type="file" accept="audio/*" className="sr-only" onChange={importMinute} />
            </label>
            {minuteAudio ? <AudioClip src={minuteAudio} label="Écouter la minute" /> : null}
            {aiEnabled && minuteAudio ? (
              <button
                type="button"
                className="button button--block"
                disabled={transcription.status === 'loading'}
                onClick={() => void transcribeMinute()}
              >
                {transcription.status === 'loading' ? 'Transcription…' : "Transcrire avec l'IA"}
              </button>
            ) : null}
            {transcription.status === 'error' ? (
              <p role="alert" className="ai-error">{transcription.message}</p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="conversation-transcript">Transcription de la minute</label>
            <textarea
              id="conversation-transcript"
              rows={4}
              value={transcribedMinute}
              onChange={(event) => setTranscribedMinute(event.target.value)}
              placeholder="Marque les pauses avec (…) et les phrases abandonnées avec //"
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="conversation-mid-pauses">Pauses au milieu d'une phrase</label>
              <input
                id="conversation-mid-pauses"
                type="number"
                min={0}
                value={midClausePauses}
                onChange={(event) => setMidClausePauses(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="conversation-abandoned">Phrases abandonnées</label>
              <input
                id="conversation-abandoned"
                type="number"
                min={0}
                value={abandonedSentences}
                onChange={(event) => setAbandonedSentences(event.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="conversation-rewrite">La même minute, réécrite</label>
            <textarea
              id="conversation-rewrite"
              rows={4}
              value={rewrittenMinute}
              onChange={(event) => setRewrittenMinute(event.target.value)}
            />
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="conversation-word">Un mot qui t'a manqué ?</label>
          <input
            id="conversation-word"
            value={missingWord}
            onChange={(event) => setMissingWord(event.target.value)}
            autoComplete="off"
          />
        </div>

        {missingWord.trim() ? (
          <div className="field">
            <label htmlFor="conversation-word-context">
              Quelle idée voulais-tu exprimer ?
            </label>
            <input
              id="conversation-word-context"
              value={missingWordContext}
              onChange={(event) => setMissingWordContext(event.target.value)}
              required
              autoComplete="off"
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="conversation-block">
            Quelle formulation corrigée veux-tu réutiliser après un blocage ?
          </label>
          <input
            id="conversation-block"
            value={blockingMoment}
            onChange={(event) => setBlockingMoment(event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="conversation-expression">
            Une expression utile entendue ou utilisée ?
          </label>
          <input
            id="conversation-expression"
            value={expressionToReuse}
            onChange={(event) => setExpressionToReuse(event.target.value)}
            autoComplete="off"
          />
        </div>

        {expressionToReuse.trim() ? (
          <div className="field">
            <label htmlFor="conversation-intent">À quoi sert cette expression ?</label>
            <input
              id="conversation-intent"
              value={expressionIntent}
              onChange={(event) => setExpressionIntent(event.target.value)}
              required
              autoComplete="off"
            />
          </div>
        ) : null}

        <button type="submit" className="button button--block" disabled={!valid}>
          Enregistrer la conversation
        </button>
      </form>
    </section>
  )
}
