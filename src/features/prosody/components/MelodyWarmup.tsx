import { useAudioRecorder } from '../../../hooks/useAudioRecorder'
import type { ProsodyExercise } from '../types'
import { imitationTranscript, speechRateFor } from '../types'
import { AudioClip } from '../../../components/AudioClip/AudioClip'

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
      <summary>Échauffement mélodique « la-la-la » <span className="muted">(optionnel, 1–2 min)</span></summary>
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
            <button type="button" className="button button--block" onClick={recorder.stop}>
              ⏹ Arrêter l'enregistrement
            </button>
          ) : (
            <button
              type="button"
              className="button button--ghost button--block"
              onClick={() => void recorder.start()}
            >
              🎤 {recorder.blobUrl ? 'Refaire mon « la-la-la »' : 'Enregistrer mon « la-la-la »'}
            </button>
          )}
          {recorder.blobUrl ? (
            <AudioClip src={recorder.blobUrl} label="Écouter mon essai" />
          ) : null}
        </div>
      ) : (
        <p className="muted">Fais-le à voix haute juste après l'écoute.</p>
      )}
    </details>
  )
}
