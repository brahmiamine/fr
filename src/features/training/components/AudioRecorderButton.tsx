import { useAudioRecorder } from '../../../hooks/useAudioRecorder'
import '../training.css'

/**
 * Discreet optional recording control. Hidden when the browser does not
 * support MediaRecorder (e.g. in tests). The audio is session-only.
 */
export function AudioRecorderButton() {
  const recorder = useAudioRecorder()

  if (!recorder.supported) return null

  return (
    <div className="audio">
      {recorder.status === 'idle' || recorder.status === 'denied' ? (
        <button
          type="button"
          className="button button--ghost audio__button"
          onClick={recorder.start}
        >
          🎤 Autoriser le microphone
        </button>
      ) : null}
      {recorder.status === 'requesting' ? (
        <span className="muted audio__hint">Autorise le microphone…</span>
      ) : null}
      {recorder.status === 'recording' ? (
        <button
          type="button"
          className="button audio__button"
          onClick={recorder.stop}
        >
          ⏹ Arrêter l'enregistrement
        </button>
      ) : null}
      {recorder.status === 'stopped' && recorder.blobUrl ? (
        <div className="audio__row">
          <audio src={recorder.blobUrl} controls preload="metadata" />
          <button
            type="button"
            className="button button--ghost audio__button"
            onClick={recorder.start}
          >
            Enregistrer à nouveau
          </button>
        </div>
      ) : null}
    </div>
  )
}
