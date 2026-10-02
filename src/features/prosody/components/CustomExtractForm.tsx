import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { CustomExtractInput } from '../customExtract'
import { validateCustomExtract } from '../customExtract'

export interface CustomExtractFormProps {
  onSubmit: (input: CustomExtractInput) => void
  onCancel: () => void
}

function roundSeconds(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Import a real French excerpt (podcast, video, recording of a friend…). The
 * audio stays in memory: nothing is uploaded or stored.
 */
export function CustomExtractForm({ onSubmit, onCancel }: CustomExtractFormProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [idea, setIdea] = useState('')
  const [start, setStart] = useState('0')
  const [end, setEnd] = useState('8')
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
  }, [audioUrl])

  const input: CustomExtractInput = {
    audioUrl,
    transcript,
    durationSeconds: duration,
    imitation: { start: Number(start) || 0, end: Number(end) || 0 },
    idea,
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const problems = validateCustomExtract(input)
    setErrors(problems)
    if (problems.length === 0) onSubmit(input)
  }

  const markCurrent = (setter: (value: string) => void) => {
    const current = audioRef.current?.currentTime ?? 0
    setter(String(roundSeconds(current)))
  }

  return (
    <section className="card exercise" aria-labelledby="custom-title">
      <p className="pill">Mon extrait</p>
      <h1 id="custom-title">Travailler sur une vraie voix</h1>
      <p className="muted">
        Choisis 10 à 30 s de conversation française naturelle (podcast, vidéo,
        message vocal d'un ami) dont tu as le droit d'usage. L'audio reste sur
        ton appareil, en mémoire.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="custom-audio">Fichier audio</label>
          <input
            id="custom-audio"
            type="file"
            accept="audio/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              if (audioUrl) URL.revokeObjectURL(audioUrl)
              setDuration(0)
              setAudioUrl(URL.createObjectURL(file))
            }}
          />
        </div>
        {audioUrl ? (
          <div className="field">
            <audio
              ref={audioRef}
              src={audioUrl}
              controls
              preload="metadata"
              onLoadedMetadata={(event) => {
                const value = event.currentTarget.duration
                if (Number.isFinite(value)) {
                  setDuration(roundSeconds(value))
                  setEnd(String(roundSeconds(Math.min(value, 8))))
                }
              }}
            />
            {duration > 0 ? <span className="muted">Durée : {duration} s</span> : null}
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="custom-transcript">Transcription exacte</label>
          <textarea
            id="custom-transcript"
            rows={4}
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="custom-idea">Idée principale, pour le retelling (facultatif)</label>
          <input
            id="custom-idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            autoComplete="off"
          />
        </div>
        <fieldset className="field">
          <legend>Segment à imiter (5–15 s)</legend>
          <div className="custom-extract__segment">
            <label>
              Début (s)
              <input
                type="number"
                min={0}
                step={0.1}
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button button--ghost"
              disabled={!audioUrl}
              onClick={() => markCurrent(setStart)}
            >
              Début = position actuelle
            </button>
            <label>
              Fin (s)
              <input
                type="number"
                min={0}
                step={0.1}
                value={end}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="button button--ghost"
              disabled={!audioUrl}
              onClick={() => markCurrent(setEnd)}
            >
              Fin = position actuelle
            </button>
          </div>
        </fieldset>
        {errors.length > 0 ? (
          <ul className="warning-banner" role="alert">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
        <div className="stack">
          <button type="submit" className="button button--block">
            Commencer avec cet extrait
          </button>
          <button type="button" className="button button--ghost button--block" onClick={onCancel}>
            Revenir aux modèles de l'application
          </button>
        </div>
      </form>
    </section>
  )
}
