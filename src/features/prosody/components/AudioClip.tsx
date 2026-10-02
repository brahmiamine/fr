import { useEffect, useRef, useState } from 'react'
import { WaveBars } from '../../../components/ui'
import { cancelSpeech, speakText } from '../speech'

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

  useEffect(() => () => cancelSpeech(), [])

  const setPlayback = (value: boolean) => {
    setPlaying(value)
    onPlaybackChange?.(value)
  }

  const completePlayback = () => {
    if (completedRef.current) return
    completedRef.current = true
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

  const handleTimeUpdate = () => {
    const audio = audioRef.current
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
          <WaveBars
            count={32}
            height={44}
            playing={playing}
            tone={playing ? 'gradient' : 'accent'}
            className={`audio-player__wave${playing ? ' is-playing' : ''}`}
          />
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
