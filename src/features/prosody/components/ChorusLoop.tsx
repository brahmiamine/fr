import { useState } from 'react'
import type { ProsodyExercise } from '../types'
import { CHORUS_GAP_MS, CHORUS_PASSES, imitationTranscript, speechRateFor } from '../types'
import { AudioClip } from '../../../components/AudioClip/AudioClip'

export interface ChorusLoopProps {
  exercise: ProsodyExercise
  audioSrc: string
  onPass: () => void
  onDone: () => void
}

/** One instruction per chorusing pass: listen, then one dimension at a time. */
const PASS_INSTRUCTIONS = [
  'Passe 1 — écoute seule, sans parler.',
  'Passe 2 — parle à mi-voix, en même temps.',
  'Passe 3 — voix pleine : le découpage (où ça coupe, où ça enchaîne).',
  "Passe 4 — voix pleine : l'allongement de la dernière syllabe.",
  'Passe 5 — voix pleine : les montées et les descentes.',
  'Passe 6 — voix pleine : les réductions et les enchaînements.',
]

/**
 * Chorusing: the same short segment is looped 6 times, ≈650 ms apart, while the
 * learner speaks in parallel — once per pass, focusing on a single dimension.
 */
export function ChorusLoop({ exercise, audioSrc, onPass, onDone }: ChorusLoopProps) {
  const [passesDone, setPassesDone] = useState(0)
  const running = passesDone < CHORUS_PASSES
  const current = Math.min(passesDone, PASS_INSTRUCTIONS.length - 1)

  return (
    <section className="card exercise exercise--center" aria-labelledby="chorus-title">
      <p className="pill">Chorusing · passe {Math.min(passesDone + 1, CHORUS_PASSES)}/{CHORUS_PASSES}</p>
      <h2 id="chorus-title">{running ? 'Parle en même temps que le locuteur.' : 'Boucle terminée.'}</h2>
      <p className="muted">{running ? PASS_INSTRUCTIONS[current] : 'Les 6 passes sont faites.'}</p>
      {running ? (
        <AudioClip
          src={audioSrc || undefined}
          speechText={exercise.modelKind === 'tts' ? imitationTranscript(exercise) : undefined}
          speechLocale={exercise.voiceLocale}
          speechRate={speechRateFor(exercise)}
          start={exercise.imitation.start}
          end={exercise.imitation.end}
          label={`Lancer la passe ${passesDone + 1}`}
          onComplete={() => {
            onPass()
            setPassesDone((value) => value + 1)
          }}
        />
      ) : null}
      <p className="muted">
        {running
          ? `Environ ${CHORUS_GAP_MS} ms de pause avant la passe suivante.`
          : 'Le segment est maintenant prêt à être dit de mémoire.'}
      </p>
      <button
        type="button"
        className="button button--block"
        onClick={onDone}
        disabled={running}
      >
        Continuer vers la mémoire
      </button>
    </section>
  )
}
