import { useRef, useState } from 'react'

export interface AudioClipProps {
  src: string
  /** Optional segment window (seconds). When set, playback is restricted to it. */
  start?: number
  end?: number
  label?: string
  variant?: 'button' | 'block'
}

/**
 * Plays a model audio file, optionally restricted to a [start, end) segment.
 * Used for full-sentence listening and for the imitation segment.
 */
export function AudioClip({
  src,
  start,
  end,
  label = 'Écouter',
  variant = 'button',
}: AudioClipProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    if (audio.ended) {
      audio.currentTime = start ?? 0
    } else if (
      start !== undefined &&
      (audio.currentTime < start || (end !== undefined && audio.currentTime >= end))
    ) {
      audio.currentTime = start
    }

    void audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false))
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (audio && end !== undefined && audio.currentTime >= end) {
      audio.pause()
      setPlaying(false)
    }
  }

  return (
    <span className={`audio-clip audio-clip--${variant}`}>
      <button
        type="button"
        className={`button ${variant === 'block' ? 'button--block' : 'button--ghost'}`}
        onClick={togglePlayback}
        aria-pressed={playing}
      >
        <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
        {label}
      </button>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
      />
    </span>
  )
}
