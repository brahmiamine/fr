import type { ProsodyExercise } from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { RecorderControls } from './RecorderControls'

export interface ColdExerciseProps {
  exercise: ProsodyExercise
  recorder: ProsodyRecorder
  onRecorded: () => void
}

/**
 * "Le test à froid" : before hearing the model again, the learner re-says the
 * segment from memory. This version becomes the reference for the review.
 */
export function ColdExercise({ exercise, recorder, onRecorded }: ColdExerciseProps) {
  return (
    <section className="card exercise exercise--center" aria-labelledby="cold-title">
      <p className="pill">Test à froid</p>
      <h2 id="cold-title">Redis l'extrait de mémoire, avant toute écoute.</h2>
      <p className="exercise__expression">{exercise.retelling.idea}</p>
      <p className="muted">
        L'audio et la transcription restent cachés. Dis le segment comme tu t'en
        souviens, en gardant sa mélodie. Cette version devient ta référence.
      </p>
      <RecorderControls recorder={recorder} recordLabel="Enregistrer ma version à froid" />
      <button
        type="button"
        className="button button--block"
        disabled={!recorder.current}
        onClick={() => {
          recorder.keepAsCold()
          onRecorded()
        }}
      >
        Garder cette version à froid
      </button>
    </section>
  )
}
