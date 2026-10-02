import type { ProsodyExercise } from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { AudioClip } from './AudioClip'
import { RecorderControls } from './RecorderControls'

export interface ImitationExerciseProps {
  exercise: ProsodyExercise
  step: 'listen' | 'record' | 'shadow'
  audioSrc: string
  recorder: ProsodyRecorder
  onListened: () => void
  onRecorded: () => void
  onShadowDone: () => void
}

export function ImitationExercise({
  exercise,
  step,
  audioSrc,
  recorder,
  onListened,
  onRecorded,
  onShadowDone,
}: ImitationExerciseProps) {
  if (step === 'listen') {
    return (
      <section className="card exercise" aria-labelledby="imitation-listen">
        <p className="pill">Imitation · Écoute</p>
        <h2 id="imitation-listen">Écoute le segment 2 ou 3 fois.</h2>
        <AudioClip
          src={audioSrc}
          start={exercise.imitation.start}
          end={exercise.imitation.end}
          label="Écouter le segment"
          variant="block"
        />
        <div className="exercise__rescue">
          <h3>Puis copie :</h3>
          <ul>
            <li>✓ le rythme</li>
            <li>✓ les pauses</li>
            <li>✓ la montée / descente</li>
            <li>✓ la durée</li>
            <li>✓ l'énergie</li>
          </ul>
        </div>
        <button type="button" className="button button--block" onClick={onListened}>
          Enregistrer mon imitation
        </button>
      </section>
    )
  }

  if (step === 'record') {
    return (
      <section className="card exercise" aria-labelledby="imitation-record">
        <p className="pill">Imitation · V1</p>
        <h2 id="imitation-record">Imite le segment, à voix haute.</h2>
        <p className="muted">
          Écoute, puis enregistre ton imitation (c'est la version 1).
        </p>
        <AudioClip
          src={audioSrc}
          start={exercise.imitation.start}
          end={exercise.imitation.end}
          label="Réécouter le segment"
        />
        <RecorderControls recorder={recorder} recordLabel="Enregistrer mon imitation" />
        <button
          type="button"
          className="button button--block"
          disabled={!recorder.current}
          onClick={() => {
            recorder.keepAsAttempt1()
            onRecorded()
          }}
        >
          J'ai enregistré ma version (V1)
        </button>
      </section>
    )
  }

  return (
    <section className="card exercise exercise--center" aria-labelledby="imitation-shadow">
      <p className="pill">Shadowing</p>
      <h2 id="imitation-shadow">Parle presque en même temps que le locuteur.</h2>
      <p className="muted">
        Ne cherche pas la perfection : le but est d'automatiser le mouvement de
        la voix.
      </p>
      <AudioClip
        src={audioSrc}
        start={exercise.imitation.start}
        end={exercise.imitation.end}
        label="Démarrer le shadowing"
        variant="block"
      />
      <button type="button" className="button button--block" onClick={onShadowDone}>
        Continuer vers la comparaison
      </button>
    </section>
  )
}
