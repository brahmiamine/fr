import { useState } from 'react'
import type { ProsodyExercise } from '../types'
import { imitationTranscript, speechRateFor } from '../types'
import {
  REQUIRED_IMITATION_LISTENS,
  REQUIRED_SHADOW_PLAYS,
} from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { AudioClip } from './AudioClip'
import { MelodyWarmup } from './MelodyWarmup'
import { RecorderControls } from './RecorderControls'

export interface ImitationExerciseProps {
  exercise: ProsodyExercise
  step: 'listen' | 'record' | 'shadow'
  modelPlays: number
  shadowPlays: number
  audioSrc: string
  recorder: ProsodyRecorder
  onModelPlayed: () => void
  onListened: () => void
  onRecorded: () => void
  onShadowPlayed: () => void
  onShadowDone: () => void
}

export function ImitationExercise({
  exercise,
  step,
  modelPlays,
  shadowPlays,
  audioSrc,
  recorder,
  onModelPlayed,
  onListened,
  onRecorded,
  onShadowPlayed,
  onShadowDone,
}: ImitationExerciseProps) {
  const [modelPlaying, setModelPlaying] = useState(false)

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
          start={exercise.imitation.start}
          end={exercise.imitation.end}
          label="Écouter le segment"
          variant="block"
          onComplete={onModelPlayed}
        />
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
          start={exercise.imitation.start}
          end={exercise.imitation.end}
          label="Réécouter le segment"
          disabled={recorderBusy}
          onPlaybackChange={setModelPlaying}
        />
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

  const shadowDone = shadowPlays >= REQUIRED_SHADOW_PLAYS
  return (
    <section className="card exercise exercise--center" aria-labelledby="imitation-shadow">
      <p className="pill">Shadowing</p>
      <h2 id="imitation-shadow">Parle presque en même temps que le locuteur.</h2>
      <p className="muted">
        Lance le segment et suis réellement la voix jusqu'au bout. Le but est
        d'automatiser son mouvement.
      </p>
      <AudioClip
        src={audioSrc || undefined}
        speechText={exercise.modelKind === 'tts' ? imitationTranscript(exercise) : undefined}
        speechLocale={exercise.voiceLocale}
        speechRate={speechRateFor(exercise)}
        start={exercise.imitation.start}
        end={exercise.imitation.end}
        label="Démarrer le shadowing"
        variant="block"
        onComplete={onShadowPlayed}
      />
      <p className="muted">Shadowing complet : {Math.min(shadowPlays, 1)}/1</p>
      <button
        type="button"
        className="button button--block"
        onClick={onShadowDone}
        disabled={!shadowDone}
      >
        Continuer vers la comparaison
      </button>
    </section>
  )
}
