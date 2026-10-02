import { useEffect, useRef, useState } from 'react'
import { cancelSpeech, speakText } from '../speech'

const PLAYER_BARS = 56

/** Deterministic pseudo-random heights (percent) so the waveform stays stable. */
const BAR_HEIGHTS = Array.from({ length: PLAYER_BARS }, (_, index) =>
  Math.round(25 + 75 * Math.abs(Math.sin(index * 1.7 + 0.6) * Math.cos(index * 0.37))),
)

/** Rough spoken duration of a text, to animate progress while speech synthesis plays. */
function estimateSpeechSeconds(text: string, rate = 1): number {
  return Math.max(1.5, text.length / (14 * Math.max(0.5, rate)))
}

export interface AudioClipProps {
  src?: string
  speechText?: string
  speechLocale?: string
  speechRate?: number
  start?: number
  end?: number
  label?: string
  variant?: 'button' | 'block' | 'player'
  /** Caption shown under the waveform in the player variant. */
  caption?: string
  disabled?: boolean
  onPlaybackChange?: (playing: boolean) => void
  onComplete?: () => void
}

export function AudioClip({
  src,
  speechText,
  speechLocale,
  speechRate,
  start,
  end,
  label = 'Écouter',
  variant = 'button',
  caption,
  disabled = false,
  onPlaybackChange,
  onComplete,
}: AudioClipProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const completedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => () => cancelSpeech(), [])

  // Synthesised speech reports no position: animate against an estimated length.
  useEffect(() => {
    if (!speechText || !playing) return
    const total = estimateSpeechSeconds(speechText, speechRate) * 1000
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      setProgress(Math.min(0.97, (Date.now() - startedAt) / total))
    }, 100)
    return () => window.clearInterval(id)
  }, [speechText, speechRate, playing])

  const setPlayback = (value: boolean) => {
    setPlaying(value)
    onPlaybackChange?.(value)
  }

  const completePlayback = () => {
    if (completedRef.current) return
    completedRef.current = true
    setProgress(1)
    setPlayback(false)
    onComplete?.()
  }

  const togglePlayback = () => {
    if (disabled) return

    if (speechText) {
      if (playing) {
        cancelSpeech()
        setPlayback(false)
        return
      }
      completedRef.current = false
      setProgress(0)
      const started = speakText(speechText, {
        lang: speechLocale,
        rate: speechRate,
        onStart: () => setPlayback(true),
        onEnd: completePlayback,
        onError: () => setPlayback(false),
      })
      if (!started) setPlayback(false)
      return
    }

    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlayback(false)
      return
    }
    if (
      audio.ended ||
      (start !== undefined &&
        (audio.currentTime < start || (end !== undefined && audio.currentTime >= end)))
    ) {
      audio.currentTime = start ?? 0
    }
    completedRef.current = false
    void audio.play().then(() => setPlayback(true)).catch(() => setPlayback(false))
  }

  const audioRange = (audio: HTMLAudioElement): [number, number] => {
    const from = start ?? 0
    const to = end ?? (Number.isFinite(audio.duration) ? audio.duration : from)
    return [from, to]
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (audio) {
      const [from, to] = audioRange(audio)
      if (to > from) {
        setProgress(Math.min(1, Math.max(0, (audio.currentTime - from) / (to - from))))
      }
    }
    if (audio && end !== undefined && audio.currentTime >= end) {
      audio.pause()
      completePlayback()
    }
  }

  const audioElement =
    src && !speechText ? (
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={completePlayback}
        onPause={() => {
          if (!completedRef.current) setPlayback(false)
        }}
      />
    ) : null

  const seekTo = (fraction: number) => {
    const audio = audioRef.current
    if (!audio || speechText) return
    const [from, to] = audioRange(audio)
    if (to <= from) return
    const next = Math.min(1, Math.max(0, fraction))
    audio.currentTime = from + next * (to - from)
    setProgress(next)
  }

  if (variant === 'player') {
    return (
      <div className="audio-clip audio-clip--player">
        <button
          type="button"
          className="audio-player__play"
          onClick={togglePlayback}
          aria-pressed={playing}
          aria-label={playing ? 'Pause' : label}
          disabled={disabled || (!src && !speechText)}
        >
          <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
        </button>
        <div className="audio-player__body">
          <div
            className="audio-player__wave"
            role="slider"
            tabIndex={speechText ? -1 : 0}
            aria-label="Position dans l'extrait"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-disabled={Boolean(speechText)}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              if (rect.width > 0) seekTo((event.clientX - rect.left) / rect.width)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') seekTo(progress + 0.05)
              if (event.key === 'ArrowLeft') seekTo(progress - 0.05)
            }}
          >
            {BAR_HEIGHTS.map((height, index) => (
              <span
                key={index}
                className={`audio-player__bar${
                  (index + 0.5) / PLAYER_BARS <= progress ? ' is-played' : ''
                }`}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          {caption ? <p className="audio-player__caption">{caption}</p> : null}
        </div>
        {audioElement}
      </div>
    )
  }

  return (
    <span className={`audio-clip audio-clip--${variant}`}>
      <button
        type="button"
        className={`button ${variant === 'block' ? 'button--block' : 'button--ghost'}`}
        onClick={togglePlayback}
        aria-pressed={playing}
        disabled={disabled || (!src && !speechText)}
      >
        <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
        {label}
      </button>
      {audioElement}
    </span>
  )
}
