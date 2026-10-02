import type { ProsodyExercise } from '../types'
import { MIN_RETELL_SECONDS, TARGET_RETELL_SECONDS } from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { RecorderControls } from './RecorderControls'

export interface RetellingExerciseProps {
  exercise: ProsodyExercise
  step: 'prompt' | 'record' | 'review'
  recorder: ProsodyRecorder
  durationSeconds: number
  onStart: () => void
  onRecorded: (durationSeconds: number) => void
  onDone: () => void
}

export function RetellingExercise({
  exercise,
  step,
  recorder,
  durationSeconds,
  onStart,
  onRecorded,
  onDone,
}: RetellingExerciseProps) {
  if (step === 'prompt') {
    return (
      <section className="card exercise exercise--center" aria-labelledby="retelling-prompt">
        <p className="pill">Retelling</p>
        <h2 id="retelling-prompt">💭 Idée :</h2>
        <p className="exercise__expression">{exercise.retelling.idea}</p>
        <p className="muted">
          Le modèle audio et la transcription sont cachés. Dis la même idée avec
          tes propres mots, en gardant les groupes, le rythme, les pauses et une
          mélodie similaire.
        </p>
        <p className="pill">
          Objectif : {MIN_RETELL_SECONDS}–{TARGET_RETELL_SECONDS} s
        </p>
        <button type="button" className="button button--block" onClick={onStart}>
          Enregistrer ma version
        </button>
      </section>
    )
  }

  if (step === 'record') {
    const recordedSeconds = recorder.current?.durationSeconds ?? 0
    const longEnough = recordedSeconds >= MIN_RETELL_SECONDS
    return (
      <section className="card exercise" aria-labelledby="retelling-record">
        <p className="pill">Retelling · Enregistrement</p>
        <h2 id="retelling-record">Reformule librement, sans le modèle.</h2>
        <p className="muted">
          Ne récite pas. Crée ton contenu et conserve la façon de porter les mots.
        </p>
        <p className="pill">
          Minimum {MIN_RETELL_SECONDS} s · cible {TARGET_RETELL_SECONDS} s
        </p>
        <RecorderControls recorder={recorder} recordLabel="Enregistrer ma version" />
        {recorder.current && !longEnough ? (
          <p className="warning-banner" role="status">
            Continue : ton retelling dure {recordedSeconds} s. Il faut au moins{' '}
            {MIN_RETELL_SECONDS} s.
          </p>
        ) : null}
        <button
          type="button"
          className="button button--block"
          disabled={!recorder.current || !longEnough}
          onClick={() => recorder.current && onRecorded(recorder.current.durationSeconds)}
        >
          J'ai terminé
        </button>
      </section>
    )
  }

  return (
    <section className="card exercise exercise--center" aria-labelledby="retelling-review">
      <p className="pill">Écoute</p>
      <h2 id="retelling-review">Réécoute ta version.</h2>
      <p className="muted">
        Vérifie surtout les groupes, les pauses et la mélodie — pas la grammaire.
      </p>
      {recorder.current?.url ? (
        <div className="audio__row">
          <audio src={recorder.current.url} controls preload="metadata" />
          <span className="pill">{durationSeconds} s</span>
        </div>
      ) : (
        <p className="muted">Aucun enregistrement disponible.</p>
      )}
      <button type="button" className="button button--block" onClick={onDone}>
        Terminer la séance
      </button>
    </section>
  )
}
