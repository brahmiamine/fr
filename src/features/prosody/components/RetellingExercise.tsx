import type { ProsodyExercise } from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { RecorderControls } from './RecorderControls'

export interface RetellingExerciseProps {
  exercise: ProsodyExercise
  step: 'prompt' | 'record' | 'review'
  recorder: ProsodyRecorder
  onStart: () => void
  onRecorded: () => void
  onDone: () => void
}

export function RetellingExercise({
  exercise,
  step,
  recorder,
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
          tes propres mots, en gardant le rythme et les groupes.
        </p>
        <button type="button" className="button button--block" onClick={onStart}>
          Enregistrer ma version
        </button>
      </section>
    )
  }

  if (step === 'record') {
    return (
      <section className="card exercise" aria-labelledby="retelling-record">
        <p className="pill">Retelling · Enregistrement</p>
        <h2 id="retelling-record">Reformule librement, sans le modèle.</h2>
        <p className="muted">
          Garde les mêmes groupes, le même rythme et une mélodie proche.
        </p>
        <RecorderControls recorder={recorder} recordLabel="Enregistrer ma version" />
        <button
          type="button"
          className="button button--block"
          disabled={!recorder.current}
          onClick={onRecorded}
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
      {recorder.current?.url ? (
        <div className="audio__row">
          <audio src={recorder.current.url} controls preload="metadata" />
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
