import { useState } from 'react'
import type { ProsodyExercise, ProsodyFocus } from '../types'
import { FOCUS_OPTIONS, focusGoal, imitationTranscript, speechRateFor } from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { useMelodyComparison } from '../hooks/useMelodyComparison'
import { AbaPlayer } from './AbaPlayer'
import { AudioClip } from '../../../components/AudioClip/AudioClip'
import { RecorderControls } from './RecorderControls'
import { PitchContour } from './PitchContour'

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
  const melody = useMelodyComparison(exercise, recorder)

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

  const attempts = [
    ...(recorder.cold ? [{ key: 'cold', label: 'À froid', recording: recorder.cold, melody: melody.cold }] : []),
    { key: 'v1', label: 'V1', recording: recorder.attempt1, melody: melody.v1 },
    { key: 'v2', label: 'V2', recording: recorder.attempt2, melody: melody.v2 },
  ].filter((attempt) => attempt.recording?.url)

  const learners = attempts
    .map((attempt) =>
      attempt.melody.curve
        ? { key: attempt.key, label: attempt.label, semitones: attempt.melody.curve.semitones }
        : null,
    )
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return (
    <section className="card exercise" aria-labelledby="comparison-attempts">
      <p className="pill">V1 ↔ V2</p>
      <h2 id="comparison-attempts">Compare tes versions.</h2>
      <div className="stack">
        {attempts.map((attempt) => (
          <div className="audio__row" key={attempt.key}>
            <span className="muted">{attempt.label}</span>
            <AudioClip src={attempt.recording?.url ?? undefined} label={`Écouter ma version ${attempt.label}`} />
            {attempt.melody.distance !== null ? (
              <span className="pill" title="Écart de mélodie au modèle, en demi-tons">
                Δ {attempt.melody.distance}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {melody.model ? (
        <PitchContour
          exercise={exercise}
          learners={learners}
          start={exercise.imitation.start}
          end={exercise.imitation.end}
        />
      ) : null}
      <p className="muted">
        {melody.model
          ? "Ta courbe est superposée à celle du modèle. Plus Δ est petit, plus ta mélodie est proche de la sienne."
          : "La voix de synthèse n'a pas de courbe mesurée : compare à l'oreille."}
      </p>
      <button type="button" className="button button--block" onClick={onCompareDone}>
        Continuer vers le retelling
      </button>
    </section>
  )
}
