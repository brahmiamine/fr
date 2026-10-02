import { Icon } from '../../../components/ui'
import { AudioClip } from '../../../components/AudioClip/AudioClip'
import type { AudioRecorder } from '../../../hooks/useAudioRecorder'
import '../training.css'

export function AudioRecorderButton({ recorder }: { recorder: AudioRecorder }) {
  if (!recorder.supported) return null

  return (
    <div className="audio">
      {recorder.status === 'idle' || recorder.status === 'denied' ? (
        <button
          type="button"
          className="button button--ghost audio__button"
          onClick={() => void recorder.start()}
        >
          <Icon name="mic" size={18} /> Enregistrer ce tour
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
          <Icon name="stop" size={18} /> Arrêter l'enregistrement
        </button>
      ) : null}
      {recorder.status === 'stopped' && recorder.blobUrl ? (
        <div className="audio__row">
          <AudioClip src={recorder.blobUrl} label="Écouter mon enregistrement" />
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
