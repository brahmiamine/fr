import { useEffect, useRef, useState } from 'react'
import type { ProsodyExercise } from '../types'
import { MEMORY_GAP_SECONDS, imitationTranscript, speechRateFor } from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { AudioClip } from '../../../components/AudioClip/AudioClip'
import { RecorderControls } from './RecorderControls'

export interface MemoryStepProps {
  exercise: ProsodyExercise
  audioSrc: string
  recorder: ProsodyRecorder
  onDone: () => void
}

type MemoryPhase = 'listen' | 'gap' | 'recall' | 'change'

/**
 * "Écouter, pause, reproduire de mémoire" : one listen, 2 seconds of silence,
 * say the segment from memory, then change one word while keeping the melody.
 */
export function MemoryStep({ exercise, audioSrc, recorder, onDone }: MemoryStepProps) {
  const [phase, setPhase] = useState<MemoryPhase>('listen')
  const gapRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (gapRef.current) clearTimeout(gapRef.current)
  }, [])

  if (phase === 'listen') {
    return (
      <section className="card exercise exercise--center" aria-labelledby="memory-listen">
        <p className="pill">De mémoire · écoute</p>
        <h2 id="memory-listen">Écoute une dernière fois.</h2>
        <AudioClip
          src={audioSrc || undefined}
          speechText={exercise.modelKind === 'tts' ? imitationTranscript(exercise) : undefined}
          speechLocale={exercise.voiceLocale}
          speechRate={speechRateFor(exercise)}
          start={exercise.imitation.start}
          end={exercise.imitation.end}
          label="Écouter le segment"
          onComplete={() => {
            setPhase('gap')
            gapRef.current = setTimeout(() => setPhase('recall'), MEMORY_GAP_SECONDS * 1000)
          }}
        />
      </section>
    )
  }

  if (phase === 'gap') {
    return (
      <section className="card exercise exercise--center" aria-labelledby="memory-gap">
        <p className="pill">De mémoire · silence</p>
        <h2 id="memory-gap">Silence… {MEMORY_GAP_SECONDS} s.</h2>
        <p className="muted">Laisse passer le silence avant de reparler.</p>
      </section>
    )
  }

  if (phase === 'recall') {
    return (
      <section className="card exercise exercise--center" aria-labelledby="memory-recall">
        <p className="pill">De mémoire · redis-le</p>
        <h2 id="memory-recall">Redis le segment de mémoire.</h2>
        <p className="muted">Sans le modèle : retrouve les mots et la mélodie.</p>
        <RecorderControls recorder={recorder} recordLabel="Enregistrer de mémoire" />
        <button
          type="button"
          className="button button--block"
          disabled={!recorder.current}
          onClick={() => setPhase('change')}
        >
          J'ai redit de mémoire
        </button>
      </section>
    )
  }

  return (
    <section className="card exercise exercise--center" aria-labelledby="memory-change">
      <p className="pill">De mémoire · change un mot</p>
      <h2 id="memory-change">Change un mot, garde la mélodie.</h2>
      <p className="muted">
        Remplace un prénom, un lieu ou un verbe, et dis la phrase avec le même
        contour. C'est ton moule mélodique, prêt à recevoir de nouveaux mots.
      </p>
      <RecorderControls recorder={recorder} recordLabel="Enregistrer avec mon mot" />
      <button
        type="button"
        className="button button--block"
        disabled={!recorder.current}
        onClick={onDone}
      >
        Continuer vers la comparaison
      </button>
    </section>
  )
}
