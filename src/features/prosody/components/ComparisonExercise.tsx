import { useState } from 'react'
import type { ProsodyExercise, ProsodyFocus } from '../types'
import { FOCUS_OPTIONS, focusGoal, imitationTranscript, speechRateFor } from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { AbaPlayer } from './AbaPlayer'
import { AudioClip } from './AudioClip'
import { RecorderControls } from './RecorderControls'

export interface ComparisonExerciseProps {
  exercise: ProsodyExercise
  step: 'aba' | 'choose-focus' | 'retry' | 'compare-attempts'
  focus: ProsodyFocus | null
  abaCompleted: boolean
  audioSrc: string
  recorder: ProsodyRecorder
  onAbaComplete: () => void
  onAbaDone: () => void
  onChooseFocus: (focus: ProsodyFocus) => void
  onRetryDone: () => void
  onCompareDone: () => void
}

export function ComparisonExercise({
  exercise,
  step,
  focus,
  abaCompleted,
  audioSrc,
  recorder,
  onAbaComplete,
  onAbaDone,
  onChooseFocus,
  onRetryDone,
  onCompareDone,
}: ComparisonExerciseProps) {
  const [selected, setSelected] = useState<ProsodyFocus | null>(focus)
  const [modelPlaying, setModelPlaying] = useState(false)

  if (step === 'aba') {
    const hasAttempt = Boolean(recorder.attempt1?.url)
    return (
      <section className="card exercise" aria-labelledby="comparison-aba">
        <p className="pill">Comparaison A/B/A</p>
        <h2 id="comparison-aba">Natif → moi → natif</h2>
        {hasAttempt && recorder.attempt1 ? (
          <>
            <AbaPlayer
              modelSrc={audioSrc || undefined}
              modelText={exercise.modelKind === 'tts' ? imitationTranscript(exercise) : undefined}
              modelLocale={exercise.voiceLocale}
              modelRate={speechRateFor(exercise)}
              learnerSrc={recorder.attempt1.url}
              start={exercise.imitation.start}
              end={exercise.imitation.end}
              onComplete={onAbaComplete}
            />
            <p className="muted">
              L'ordre est automatique pour garder les trois écoutes rapprochées.
            </p>
            <button
              type="button"
              className="button button--block"
              onClick={onAbaDone}
              disabled={!abaCompleted}
            >
              J'ai comparé
            </button>
          </>
        ) : (
          <p className="muted">Enregistre d'abord ton imitation pour pouvoir comparer.</p>
        )}
      </section>
    )
  }

  if (step === 'choose-focus') {
    return (
      <section className="card exercise" aria-labelledby="comparison-focus">
        <p className="pill">Diagnostic</p>
        <h2 id="comparison-focus">Quelle différence entends-tu surtout ?</h2>
        <p className="muted">Choisis une seule chose à corriger.</p>
        <fieldset className="field focus-options">
          <legend className="sr-only">Différence principale</legend>
          {FOCUS_OPTIONS.map((option) => (
            <label key={option.value} className="focus-option">
              <input
                type="radio"
                name="prosody-focus"
                value={option.value}
                checked={selected === option.value}
                onChange={() => setSelected(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
        <button
          type="button"
          className="button button--block"
          disabled={!selected}
          onClick={() => selected && onChooseFocus(selected)}
        >
          Continuer
        </button>
      </section>
    )
  }

  if (step === 'retry') {
    const recorderBusy =
      recorder.status === 'recording' || recorder.status === 'requesting'
    return (
      <section className="card exercise exercise--center" aria-labelledby="comparison-retry">
        <p className="pill">Correction</p>
        <h2 id="comparison-retry">Ton seul objectif maintenant</h2>
        <p className="exercise__expression">« {focusGoal(focus, exercise)} »</p>
        <p className="muted">Refais uniquement ce point. Ne corrige rien d'autre.</p>
        <AudioClip
          src={audioSrc || undefined}
          speechText={exercise.modelKind === 'tts' ? imitationTranscript(exercise) : undefined}
          speechLocale={exercise.voiceLocale}
          speechRate={speechRateFor(exercise)}
          start={exercise.imitation.start}
          end={exercise.imitation.end}
          label="Réécouter le modèle"
          disabled={recorderBusy}
          onPlaybackChange={setModelPlaying}
        />
        <RecorderControls
          recorder={recorder}
          recordLabel="Enregistrer ma version 2"
          disabled={modelPlaying}
        />
        <button
          type="button"
          className="button button--block"
          disabled={!recorder.current}
          onClick={() => {
            recorder.keepAsAttempt2()
            onRetryDone()
          }}
        >
          Garder cette version (V2)
        </button>
      </section>
    )
  }

  return (
    <section className="card exercise" aria-labelledby="comparison-attempts">
      <p className="pill">V1 ↔ V2</p>
      <h2 id="comparison-attempts">Compare tes deux versions.</h2>
      <div className="stack">
        <div className="audio__row">
          <span className="muted">V1</span>
          <audio src={recorder.attempt1?.url ?? undefined} controls preload="metadata" />
        </div>
        <div className="audio__row">
          <span className="muted">V2</span>
          <audio src={recorder.attempt2?.url ?? undefined} controls preload="metadata" />
        </div>
      </div>
      <button type="button" className="button button--block" onClick={onCompareDone}>
        Continuer vers le retelling
      </button>
    </section>
  )
}
