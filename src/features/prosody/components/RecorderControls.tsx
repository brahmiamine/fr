import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'

export interface RecorderControlsProps {
  recorder: ProsodyRecorder
  recordLabel?: string
}

export function RecorderControls({ recorder, recordLabel }: RecorderControlsProps) {
  if (!recorder.supported) {
    return (
      <p className="muted">
        L'enregistrement n'est pas pris en charge par ce navigateur.
      </p>
    )
  }

  return (
    <div className="audio">
      {recorder.status === 'idle' || recorder.status === 'denied' ? (
        <button
          type="button"
          className="button button--gradient"
          onClick={() => void recorder.start()}
        >
          🎤 {recordLabel ?? 'Enregistrer'}
        </button>
      ) : null}
      {recorder.status === 'requesting' ? (
        <span className="muted audio__hint">Autorise le microphone…</span>
      ) : null}
      {recorder.status === 'recording' ? (
        <button type="button" className="button" onClick={recorder.stop}>
          ⏹ Arrêter l'enregistrement
        </button>
      ) : null}
      {recorder.status === 'stopped' && recorder.current?.url ? (
        <div className="audio__row">
          <audio src={recorder.current.url} controls preload="metadata" />
        </div>
      ) : null}
    </div>
  )
}
