import type { ProsodyExercise } from '../types'

const HEIGHT = 90
const RANGE = 9 // semitones shown above and below the speaker's usual pitch

/**
 * The model's real melody, measured on the recording: its pitch in semitones
 * around the speaker's usual level, with the rhythmic group boundaries. The
 * learner checks their ↑ ↓ against what the voice actually does.
 */
export function PitchContour({
  exercise,
  playhead = null,
}: {
  exercise: Pick<ProsodyExercise, 'pitch' | 'groups'>
  /** Current playback time, in seconds. */
  playhead?: number | null
}) {
  const pitch = exercise.pitch
  if (!pitch || pitch.semitones.length < 2) return null
  const width = pitch.semitones.length - 1
  const x = (seconds: number) => seconds / pitch.step
  const y = (semitones: number) =>
    HEIGHT / 2 - (Math.max(-RANGE, Math.min(RANGE, semitones)) / RANGE) * (HEIGHT / 2 - 4)

  // One polyline per voiced stretch.
  const stretches: string[] = []
  let current: string[] = []
  pitch.semitones.forEach((value, index) => {
    if (value === null) {
      if (current.length > 1) stretches.push(current.join(' '))
      current = []
      return
    }
    current.push(`${index},${y(value).toFixed(1)}`)
  })
  if (current.length > 1) stretches.push(current.join(' '))

  return (
    <figure className="pitch-contour">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Courbe de hauteur de voix du modèle"
      >
        <line className="pitch-contour__mid" x1={0} x2={width} y1={HEIGHT / 2} y2={HEIGHT / 2} />
        {exercise.groups.slice(0, -1).map((group) => (
          <line
            key={`b-${group.end}`}
            className="pitch-contour__boundary"
            x1={x(group.end)}
            x2={x(group.end)}
            y1={0}
            y2={HEIGHT}
          />
        ))}
        {stretches.map((points) => (
          <polyline key={points.slice(0, 24)} className="pitch-contour__line" points={points} />
        ))}
        {playhead !== null ? (
          <line
            className="pitch-contour__playhead"
            x1={x(playhead)}
            x2={x(playhead)}
            y1={0}
            y2={HEIGHT}
          />
        ) : null}
      </svg>
      <figcaption className="muted">
        Mélodie réelle du locuteur, mesurée sur l'enregistrement : plus la ligne
        monte, plus la voix est aiguë. Les traits verticaux sont ses pauses.
      </figcaption>
    </figure>
  )
}
