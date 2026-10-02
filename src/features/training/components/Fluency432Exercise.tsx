import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Chunk, Topic } from '../../../types/content'
import { Timer } from '../../../components/Timer/Timer'
import { useAudioRecorder } from '../../../hooks/useAudioRecorder'
import { FLUENCY_ROUND_SECONDS } from '../types'
import type { FluencyFeedback, FluencyReminder } from '../types'
import { AudioRecorderButton } from './AudioRecorderButton'

export interface Fluency432ExerciseProps {
  topic: Topic
  roundIndex: number
  stage: 'prep' | 'running' | 'feedback'
  feedback: FluencyFeedback
  keywords: string[]
  chunksOfDay: Chunk[]
  focusWords: string[]
  fluencyReminders: FluencyReminder[]
  onKeywordsChange: (keywords: string[]) => void
  onStartRound: () => void
  onRoundComplete: () => void
  onSubmitFeedback: (values: FluencyFeedback) => void
}

const ROUND_LABELS = [
  'Tour 1 — 4:00',
  'Tour 2 — 3:00',
  'Tour 3 — 2:00',
  'Transfert — 1:00',
]

const RUNNING_HINTS = [
  'Continue. Un mot manque ? Explique-le autrement.',
  'Reformule, ne récite pas.',
  'Continue à parler.',
  'Nouveau sujet : réutilise ce que tu viens de travailler.',
]

function splitKeywords(value: string): string[] {
  return value
    .split(/[,
]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3)
}

export function Fluency432Exercise({
  topic,
  roundIndex,
  stage,
  feedback,
  keywords,
  chunksOfDay,
  focusWords,
  fluencyReminders,
  onKeywordsChange,
  onStartRound,
  onRoundComplete,
  onSubmitFeedback,
}: Fluency432ExerciseProps) {
  const [missingWord, setMissingWord] = useState(feedback.missingWord)
  const [missingWordContext, setMissingWordContext] = useState(
    feedback.missingWordContext,
  )
  const [difficultPhrase, setDifficultPhrase] = useState(feedback.difficultPhrase)
  const [importantError, setImportantError] = useState(feedback.importantError)
  const recorder = useAudioRecorder()

  const isTransfer = roundIndex === FLUENCY_ROUND_SECONDS.length - 1
  const seconds = FLUENCY_ROUND_SECONDS[roundIndex] ?? 60

  if (stage === 'prep') {
    return (
      <section className="card exercise" aria-labelledby="fluency-title">
        <p className="pill">Tour 1 / 3</p>
        <h1 id="fluency-title" className="exercise__prompt">
          {topic.title}
        </h1>

        <div className="exercise__rescue">
          <h3>Quelques pistes</h3>
          <ul>
            {topic.prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </div>

        {fluencyReminders.length > 0 ? (
          <div className="exercise__rescue">
            <h3>Correction à réutiliser aujourd'hui</h3>
            <ul>
              {fluencyReminders.map((reminder) => (
                <li key={reminder.id}>{reminder.text}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {focusWords.length > 0 ? (
          <p className="exercise__chunks">
            <span className="muted">Mots à réutiliser :</span>{' '}
            {focusWords.join(' · ')}
          </p>
        ) : null}

        <div className="field">
          <label htmlFor="keywords">Note 3 mots-clés maximum (facultatif)</label>
          <input
            id="keywords"
            value={keywords.join(', ')}
            onChange={(event) => onKeywordsChange(splitKeywords(event.target.value))}
            placeholder="liberté, collègues, transport"
            autoComplete="off"
          />
        </div>

        <button type="button" className="button button--block" onClick={onStartRound}>
          Commencer le tour 1
        </button>
      </section>
    )
  }

  if (stage === 'feedback') {
    const handleSubmit = (event: FormEvent) => {
      event.preventDefault()
      if (missingWord.trim() && !missingWordContext.trim()) return
      onSubmitFeedback({
        missingWord,
        missingWordContext,
        difficultPhrase,
        importantError,
      })
    }

    return (
      <section className="card exercise" aria-labelledby="feedback-title">
        <h2 id="feedback-title">Petit retour (30–60 s)</h2>

        {recorder.blobUrl ? (
          <div className="exercise__rescue">
            <h3>Écoute environ 1 minute</h3>
            <p className="muted">
              Écoute ton tour avant de corriger. Cherche seulement un mot,
              une phrase difficile et une erreur importante.
            </p>
            <audio src={recorder.blobUrl} controls preload="metadata" />
          </div>
        ) : (
          <p className="muted">
            La prochaine fois, enregistre le premier tour : l'écoute différée
            rend le feedback beaucoup plus fiable.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="missing-word">
              Quel mot t'a manqué ? (facultatif)
            </label>
            <input
              id="missing-word"
              value={missingWord}
              onChange={(event) => setMissingWord(event.target.value)}
              autoComplete="off"
            />
          </div>

          {missingWord.trim() ? (
            <div className="field">
              <label htmlFor="missing-word-context">
                Quelle idée voulais-tu exprimer sans ce mot ?
              </label>
              <input
                id="missing-word-context"
                value={missingWordContext}
                onChange={(event) => setMissingWordContext(event.target.value)}
                placeholder="Ex. l'endroit dans le mur où je branche un appareil"
                autoComplete="off"
                required
              />
            </div>
          ) : null}

          <div className="field">
            <label htmlFor="difficult-phrase">Une phrase difficile à reformuler ?</label>
            <input
              id="difficult-phrase"
              value={difficultPhrase}
              onChange={(event) => setDifficultPhrase(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="important-error">
              Une erreur importante à éviter au prochain 4 → 3 → 2 ?
            </label>
            <input
              id="important-error"
              value={importantError}
              onChange={(event) => setImportantError(event.target.value)}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="button button--block">
            Continuer vers le tour 2
          </button>
        </form>
      </section>
    )
  }

  const prompt = isTransfer ? topic.transferPrompt : topic.title
  const finishRound = () => {
    recorder.stop()
    onRoundComplete()
  }

  return (
    <section className="card exercise exercise--speak" aria-live="polite">
      <p className="pill">{ROUND_LABELS[roundIndex] ?? 'Tour'}</p>
      <Timer durationSeconds={seconds} onComplete={finishRound} label={prompt} />
      <p className="exercise__hint">{RUNNING_HINTS[roundIndex]}</p>

      {keywords.length > 0 ? (
        <p className="exercise__keywords">
          {keywords.map((word) => (
            <span key={word} className="pill">{word}</span>
          ))}
        </p>
      ) : null}

      {chunksOfDay.length > 0 ? (
        <p className="exercise__chunks">
          <span className="muted">Chunks du jour :</span>{' '}
          {chunksOfDay.map((item) => item.expression).join(' · ')}
        </p>
      ) : null}

      {focusWords.length > 0 ? (
        <p className="exercise__chunks">
          <span className="muted">Mots débloqués à réutiliser :</span>{' '}
          {focusWords.join(' · ')}
        </p>
      ) : null}

      {fluencyReminders.length > 0 ? (
        <p className="exercise__chunks">
          <span className="muted">Correction :</span>{' '}
          {fluencyReminders.map((item) => item.text).join(' · ')}
        </p>
      ) : null}

      {roundIndex === 0 ? <AudioRecorderButton recorder={recorder} /> : null}
    </section>
  )
}
