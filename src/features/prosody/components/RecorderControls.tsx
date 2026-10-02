import { Icon } from '../../../components/ui'
import { AudioClip } from '../../../components/AudioClip/AudioClip'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'

export interface RecorderControlsProps {
  recorder: ProsodyRecorder
  recordLabel?: string
  disabled?: boolean
}

function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function RecorderControls({
  recorder,
  recordLabel,
  disabled = false,
}: RecorderControlsProps) {
  if (!recorder.supported) {
    return (
      <p className="muted">
        L'enregistrement n'est pas pris en charge par ce navigateur.
      </p>
    )
  }

  const canStart =
    !disabled &&
    (recorder.status === 'idle' ||
      recorder.status === 'denied' ||
      (recorder.status === 'stopped' && !recorder.current))

  return (
    <div className="audio">
      {disabled ? (
        <p className="muted audio__hint">Termine d'abord l'écoute du modèle.</p>
      ) : null}
      {canStart ? (
        <button
          type="button"
          className="button button--gradient"
          onClick={() => void recorder.start()}
        >
          <Icon name="mic" size={18} /> {recordLabel ?? 'Enregistrer'}
        </button>
      ) : null}
      {recorder.status === 'requesting' ? (
        <span className="muted audio__hint">Autorise le microphone…</span>
      ) : null}
      {recorder.status === 'recording' ? (
        <>
          <span className="pill">{formatSeconds(recorder.recordingSeconds)}</span>
          <button type="button" className="button" onClick={recorder.stop}>
            <Icon name="stop" size={18} /> Arrêter l'enregistrement
          </button>
        </>
      ) : null}
      {recorder.status === 'stopped' && recorder.current?.url ? (
        <div className="stack">
          <div className="audio__row">
            <AudioClip src={recorder.current.url} label="Écouter mon enregistrement" />
            <span className="muted">
              Durée : {formatSeconds(recorder.current.durationSeconds)}
            </span>
          </div>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => void recorder.start()}
            disabled={disabled}
          >
            <Icon name="redo" size={18} /> Refaire l'enregistrement
          </button>
        </div>
      ) : null}
    </div>
  )
}
