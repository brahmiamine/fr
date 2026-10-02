const BARS = 56

/** Deterministic pseudo-random heights (percent) so the waveform stays stable. */
const BAR_HEIGHTS = Array.from({ length: BARS }, (_, index) =>
  Math.round(25 + 75 * Math.abs(Math.sin(index * 1.7 + 0.6) * Math.cos(index * 0.37))),
)

export interface VoiceWaveformProps {
  /** Share already played, between 0 and 1. */
  progress: number
  /** Called with a 0–1 position when the learner clicks or uses the arrow keys. */
  onSeek?: (fraction: number) => void
  label?: string
}

/** Voice-message waveform: bars fill as the audio advances; click to seek. */
export function VoiceWaveform({
  progress,
  onSeek,
  label = "Position dans l'extrait",
}: VoiceWaveformProps) {
  return (
    <div
      className="audio-player__wave"
      role="slider"
      tabIndex={onSeek ? 0 : -1}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      aria-disabled={!onSeek}
      onClick={(event) => {
        if (!onSeek) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (rect.width > 0) onSeek((event.clientX - rect.left) / rect.width)
      }}
      onKeyDown={(event) => {
        if (!onSeek) return
        if (event.key === 'ArrowRight') onSeek(progress + 0.05)
        if (event.key === 'ArrowLeft') onSeek(progress - 0.05)
      }}
    >
      {BAR_HEIGHTS.map((height, index) => (
        <span
          key={index}
          className={`audio-player__bar${(index + 0.5) / BARS <= progress ? ' is-played' : ''}`}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  )
}
