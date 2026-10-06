import { useState } from 'react'
import type { ProsodyExercise } from '../types'
import { imitationTranscript, speechRateFor } from '../types'
import {
  REQUIRED_IMITATION_LISTENS,
  SLOW_SPEED,
} from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { AudioClip } from '../../../components/AudioClip/AudioClip'
import { ToggleChip } from '../../../components/ui'
import { MelodyWarmup } from './MelodyWarmup'
import { RecorderControls } from './RecorderControls'
import { ChorusLoop } from './ChorusLoop'
import { MemoryStep } from './MemoryStep'

export interface ImitationExerciseProps {
  exercise: ProsodyExercise
  step: 'listen' | 'record' | 'shadow' | 'memory'
  modelPlays: number
  audioSrc: string
  recorder: ProsodyRecorder
  /** Start the listening slowed to 0.75× (first sessions). */
  slowByDefault?: boolean
  onModelPlayed: () => void
  onListened: () => void
  onRecorded: () => void
  onShadowPlayed: () => void
  onShadowDone: () => void
  onMemoryDone: () => void
}

export function ImitationExercise({
  exercise,
  step,
  modelPlays,
  audioSrc,
  recorder,
  slowByDefault = false,
  onModelPlayed,
  onListened,
  onRecorded,
  onShadowPlayed,
  onShadowDone,
  onMemoryDone,
}: ImitationExerciseProps) {
  const [modelPlaying, setModelPlaying] = useState(false)
  const [slow, setSlow] = useState(slowByDefault)
  const playbackRate = slow ? SLOW_SPEED : 1

  if (step === 'listen') {
    const ready = modelPlays >= REQUIRED_IMITATION_LISTENS
    return (
      <section className="card exercise" aria-labelledby="imitation-listen">
        <p className="pill">Imitation · Écoute</p>
        <h2 id="imitation-listen">Écoute le segment 2 ou 3 fois.</h2>
        <AudioClip
          src={audioSrc || undefined}
          speechText={exercise.modelKind === 'tts' ? imitationTranscript(exercise) : undefined}
          speechLocale={exercise.voiceLocale}
          speechRate={speechRateFor(exercise)}
          playbackRate={playbackRate}
          start={exercise.imitation.start}
          end={exercise.imitation.end}
          label="Écouter le segment"
          onComplete={onModelPlayed}
        />
        <div className="stack">
          <ToggleChip active={slow} onClick={() => setSlow((value) => !value)}>
            Ralenti 0,75×
          </ToggleChip>
        </div>
        <p className="muted">
          Écoutes complètes : {Math.min(modelPlays, REQUIRED_IMITATION_LISTENS)}/
          {REQUIRED_IMITATION_LISTENS} minimum
        </p>
        <div className="exercise__rescue">
          <h3>Puis copie :</h3>
          <ul>
            <li>✓ le rythme et la vitesse</li>
            <li>✓ les pauses et les enchaînements</li>
            <li>✓ la montée / descente</li>
            <li>✓ la durée</li>
            <li>✓ l'énergie</li>
          </ul>
        </div>
        <MelodyWarmup exercise={exercise} audioSrc={audioSrc} />
        <button
          type="button"
          className="button button--block"
          onClick={onListened}
          disabled={!ready}
        >
          Enregistrer mon imitation
        </button>
      </section>
    )
  }

  if (step === 'record') {
    const recorderBusy =
      recorder.status === 'recording' || recorder.status === 'requesting'
    return (
      <section className="card exercise" aria-labelledby="imitation-record">
        <p className="pill">Imitation · V1</p>
        <h2 id="imitation-record">Écoute → petite pause → reproduis.</h2>
        <p className="muted">
          Le modèle et le micro ne peuvent pas jouer en même temps : cette étape
          reste une imitation différée, pas du shadowing.
        </p>
        <AudioClip
          src={audioSrc || undefined}
          speechText={exercise.modelKind === 'tts' ? imitationTranscript(exercise) : undefined}
          speechLocale={exercise.voiceLocale}
          speechRate={speechRateFor(exercise)}
          playbackRate={playbackRate}
          start={exercise.imitation.start}
          end={exercise.imitation.end}
          label="Réécouter le segment"
          disabled={recorderBusy}
          onPlaybackChange={setModelPlaying}
        />
        <div className="stack">
          <ToggleChip active={slow} onClick={() => setSlow((value) => !value)}>
            Ralenti 0,75×
          </ToggleChip>
        </div>
        <RecorderControls
          recorder={recorder}
          recordLabel="Enregistrer mon imitation"
          disabled={modelPlaying}
        />
        <button
          type="button"
          className="button button--block"
          disabled={!recorder.current}
          onClick={() => {
            recorder.keepAsAttempt1()
            onRecorded()
          }}
        >
          Garder cette version (V1)
        </button>
      </section>
    )
  }

  if (step === 'memory') {
    return (
      <MemoryStep exercise={exercise} audioSrc={audioSrc} recorder={recorder} onDone={onMemoryDone} />
    )
  }

  return (
    <ChorusLoop exercise={exercise} audioSrc={audioSrc} onPass={onShadowPlayed} onDone={onShadowDone} />
  )
}
