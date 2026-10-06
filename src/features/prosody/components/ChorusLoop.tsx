import { useEffect, useRef, useState } from 'react'
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
  const [waiting, setWaiting] = useState(false)
  const containerRef = useRef<HTMLElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const running = passesDone < CHORUS_PASSES

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  // The first pass starts with the learner's tap; the five others follow on
  // their own, CHORUS_GAP_MS after the previous one ended.
  const afterPass = () => {
    onPass()
    const next = passesDone + 1
    setPassesDone(next)
    if (next >= CHORUS_PASSES) return
    setWaiting(true)
    timerRef.current = setTimeout(() => {
      setWaiting(false)
      containerRef.current?.querySelector<HTMLButtonElement>('.audio-player__play')?.click()
    }, CHORUS_GAP_MS)
  }
  const current = Math.min(passesDone, PASS_INSTRUCTIONS.length - 1)

  return (
    <section
      ref={containerRef}
      className="card exercise exercise--center"
      aria-labelledby="chorus-title"
    >
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
          label={passesDone === 0 ? 'Lancer la boucle' : `Passe ${passesDone + 1}`}
          onComplete={afterPass}
        />
      ) : null}
      <p className="muted">
        {running
          ? passesDone === 0
            ? `Touche une fois : les ${CHORUS_PASSES} passes s'enchaînent seules, ${CHORUS_GAP_MS} ms d'écart.`
            : waiting
              ? 'Pause…'
              : 'Passe en cours.'
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
