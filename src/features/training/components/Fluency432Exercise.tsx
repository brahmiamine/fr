import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Chunk, RetellingStory, Topic } from '../../../types/content'
import { SpeakButton } from '../../../components/Speech/SpeakButton'
import { Timer } from '../../../components/Timer/Timer'
import type { AudioRecorder } from '../../../hooks/useAudioRecorder'
import { FLUENCY_ROUND_SECONDS, MINI_FEEDBACK_SECONDS } from '../types'
import type { FluencyFeedback, FluencyReminder } from '../types'

export interface Fluency432ExerciseProps {
  topic: Topic
  roundIndex: number
  stage: 'prep' | 'running' | 'feedback'
  feedback: FluencyFeedback
  keywords: string[]
  chunksOfDay: Chunk[]
  focusWords: string[]
  fluencyReminders: FluencyReminder[]
  recorder?: AudioRecorder
  /** Retelling variant: the topic is a short story heard before round 1. */
  retellingStory?: RetellingStory | null
  /** Recent prosody point to keep while speaking. */
  prosodyFocusGoal?: string | null
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

const STORY_HINTS = [
  "Raconte l'histoire avec tes mots. Un mot manque ? Explique-le autrement.",
  'Raconte-la de nouveau, autrement : ne récite pas.',
  "L'essentiel, plus vite, sans t'arrêter.",
  'Nouveau sujet : réutilise ce que tu viens de travailler.',
]

function splitKeywords(value: string): string[] {
  return value
    .split(/[,\n]+/)
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
  recorder,
  retellingStory = null,
  prosodyFocusGoal = null,
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
  const [missedChunk, setMissedChunk] = useState(feedback.missedChunk ?? '')
  const [missedChunkIntent, setMissedChunkIntent] = useState(
    feedback.missedChunkIntent ?? '',
  )
  const [showPrompts, setShowPrompts] = useState(false)
  const [showStoryText, setShowStoryText] = useState(false)
  const [recordFirstRound, setRecordFirstRound] = useState(true)

  const isTransfer = roundIndex === FLUENCY_ROUND_SECONDS.length - 1
  const seconds = FLUENCY_ROUND_SECONDS[roundIndex] ?? 60

  if (stage === 'prep') {
    return (
      <section className="card exercise" aria-labelledby="fluency-title">
        <p className="pill">
          Tour 1 / 4{retellingStory ? ' · Variante retelling' : ''}
        </p>
        <h1 id="fluency-title" className="exercise__prompt">
          {topic.title}
        </h1>
        {retellingStory ? (
          <div className="exercise__rescue">
            <h3>Écoute d'abord l'histoire</h3>
            <p className="muted">
              Écoute-la sans lire, repère 2–3 expressions, puis raconte-la avec
              tes propres mots pendant les tours 4 → 3 → 2.
            </p>
            <SpeakButton
              text={retellingStory.text}
              label="Écouter l'histoire"
              ariaLabel="Écouter l'histoire"
            />
            {showStoryText ? (
              <p className="retelling-story" lang="fr">{retellingStory.text}</p>
            ) : (
              <button
                type="button"
                className="button button--ghost button--block"
                onClick={() => setShowStoryText(true)}
              >
                Lire le texte (seulement si l'audio ne marche pas)
              </button>
            )}
          </div>
        ) : (
          <SpeakButton
            text={topic.title}
            label="Écouter le sujet"
            ariaLabel="Écouter le sujet"
          />
        )}

        {showPrompts ? (
          <div className="exercise__rescue">
            <h3>Quelques pistes</h3>
            <ul>
              {topic.prompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          </div>
        ) : (
          <button
            type="button"
            className="button button--ghost button--block"
            onClick={() => setShowPrompts(true)}
          >
            Besoin d'une piste ?
          </button>
        )}

        {fluencyReminders.length > 0 ? (
          <div className="exercise__rescue">
            <h3>Correction à réutiliser aujourd'hui</h3>
            <ul className="speech-list">
              {fluencyReminders.map((reminder) => (
                <li key={reminder.id}>
                  <span>{reminder.text}</span>
                  <SpeakButton
                    text={reminder.text}
                    label="Écouter"
                    ariaLabel={`Écouter la correction ${reminder.text}`}
                    compact
                  />
                </li>
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

        {prosodyFocusGoal ? (
          <p className="exercise__chunks">
            <span className="muted">Prosodie à garder :</span> {prosodyFocusGoal}
          </p>
        ) : null}

        <div className="field">
          <label htmlFor="keywords">
            {retellingStory
              ? 'Note 2–3 expressions entendues (facultatif)'
              : 'Note 3 mots-clés maximum (facultatif)'}
          </label>
          <input
            id="keywords"
            value={keywords.join(', ')}
            onChange={(event) => onKeywordsChange(splitKeywords(event.target.value))}
            placeholder="liberté, collègues, transport"
            autoComplete="off"
          />
        </div>

        {roundIndex === 0 && recorder?.supported ? (
          <label className="field">
            <span>Enregistrer le tour 1 pour le feedback</span>
            <input
              type="checkbox"
              checked={recordFirstRound}
              onChange={(event) => setRecordFirstRound(event.target.checked)}
            />
          </label>
        ) : null}

        <button
          type="button"
          className="button button--block"
          onClick={() => {
            void (async () => {
              if (roundIndex === 0 && recordFirstRound && recorder?.supported) {
                await recorder.start()
              }
              onStartRound()
            })()
          }}
        >
          Commencer le tour 1
        </button>
      </section>
    )
  }

  if (stage === 'feedback') {
    const handleSubmit = (event: FormEvent) => {
      event.preventDefault()
      if (missingWord.trim() && !missingWordContext.trim()) return
      if (missedChunk.trim() && !missedChunkIntent.trim()) return
      onSubmitFeedback({
        missingWord,
        missingWordContext,
        difficultPhrase,
        importantError,
        missedChunk,
        missedChunkIntent,
      })
    }

    return (
      <section className="card exercise" aria-labelledby="feedback-title">
        <h2 id="feedback-title">Petit retour (30–60 s)</h2>
        <Timer
          durationSeconds={MINI_FEEDBACK_SECONDS}
          autoStart
          hideControls
          compact
          secondsOnly
          label="Reste bref"
        />

        {recorder?.blobUrl ? (
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
            <label htmlFor="difficult-phrase">
              Reformulation corrigée d'une phrase difficile (facultatif)
            </label>
            <input
              id="difficult-phrase"
              value={difficultPhrase}
              onChange={(event) => setDifficultPhrase(event.target.value)}
              autoComplete="off"
            />
            {difficultPhrase.trim() ? (
              <SpeakButton
                text={difficultPhrase}
                label="Écouter"
                ariaLabel="Écouter la phrase reformulée"
                compact
              />
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="important-error">
              Formulation corrigée à réutiliser au prochain 4 → 3 → 2
            </label>
            <input
              id="important-error"
              value={importantError}
              onChange={(event) => setImportantError(event.target.value)}
              autoComplete="off"
            />
            {importantError.trim() ? (
              <SpeakButton
                text={importantError}
                label="Écouter"
                ariaLabel="Écouter la correction à réutiliser"
                compact
              />
            ) : null}
          </div>
          <div className="field">
            <label htmlFor="missed-chunk">
              Un chunk que tu aurais pu utiliser ? (facultatif)
            </label>
            <input
              id="missed-chunk"
              value={missedChunk}
              onChange={(event) => setMissedChunk(event.target.value)}
              placeholder="Ex. D'un autre côté…"
              autoComplete="off"
            />
          </div>
          {missedChunk.trim() ? (
            <div className="field">
              <label htmlFor="missed-chunk-intent">À quoi sert-il ?</label>
              <input
                id="missed-chunk-intent"
                value={missedChunkIntent}
                onChange={(event) => setMissedChunkIntent(event.target.value)}
                placeholder="Ex. nuancer une opinion"
                autoComplete="off"
                required
              />
            </div>
          ) : null}
          <button type="submit" className="button button--block">
            Continuer vers le tour 2
          </button>
        </form>
      </section>
    )
  }

  const prompt = isTransfer ? topic.transferPrompt : topic.title
  const finishRound = () => {
    if (roundIndex === 0) recorder?.stop()
    onRoundComplete()
  }

  return (
    <section className="card exercise exercise--speak" aria-live="polite">
      <p className="pill">{ROUND_LABELS[roundIndex] ?? 'Tour'}</p>
      <Timer
        durationSeconds={seconds}
        autoStart
        hideControls
        onComplete={finishRound}
        label={prompt}
      />
      <p className="exercise__hint">
        {(retellingStory && !isTransfer ? STORY_HINTS : RUNNING_HINTS)[roundIndex]}
      </p>

      {feedback.missedChunk?.trim() && (roundIndex === 1 || roundIndex === 2) ? (
        <p className="exercise__chunks">
          <span className="muted">À placer dans ce tour :</span>{' '}
          {feedback.missedChunk}
        </p>
      ) : null}

      {prosodyFocusGoal ? (
        <p className="exercise__chunks">
          <span className="muted">Prosodie :</span> {prosodyFocusGoal}
        </p>
      ) : null}

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

    </section>
  )
}
