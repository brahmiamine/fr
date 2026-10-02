import { useAudioRecorder } from '../../../hooks/useAudioRecorder'
import type { ProsodyExercise } from '../types'
import { imitationTranscript, speechRateFor } from '../types'
import { AudioClip } from './AudioClip'

export interface MelodyWarmupProps {
  exercise: ProsodyExercise
  audioSrc: string
}

/**
 * Optional 1–2 min warm-up: reproduce only the melody of the segment with
 * "la-la-la", to isolate rhythm, duration, rises and falls from the words.
 */
export function MelodyWarmup({ exercise, audioSrc }: MelodyWarmupProps) {
  const recorder = useAudioRecorder()
  const recording = recorder.status === 'recording'

  return (
    <details className="exercise__rescue melody-warmup">
      <summary>Échauffement mélodique « la-la-la » (optionnel, 1–2 min)</summary>
      <p className="muted">
        Reproduis seulement la musique du segment avec des « la » : même
        nombre de syllabes, mêmes durées, mêmes montées et descentes. Sans les
        mots, il ne reste que la mélodie.
      </p>
      <AudioClip
        src={audioSrc || undefined}
        speechText={exercise.modelKind === 'tts' ? imitationTranscript(exercise) : undefined}
        speechLocale={exercise.voiceLocale}
        speechRate={speechRateFor(exercise)}
        start={exercise.imitation.start}
        end={exercise.imitation.end}
        label="Écouter la mélodie"
        disabled={recording}
      />
      {recorder.supported ? (
        <div className="stack">
          {recording ? (
            <button type="button" className="button" onClick={recorder.stop}>
              ⏹ Arrêter
            </button>
          ) : (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => void recorder.start()}
            >
              🎤 Enregistrer mon « la-la-la »
            </button>
          )}
          {recorder.blobUrl ? (
            <audio src={recorder.blobUrl} controls preload="metadata" />
          ) : null}
        </div>
      ) : (
        <p className="muted">Fais-le à voix haute juste après l'écoute.</p>
      )}
    </details>
  )
}
