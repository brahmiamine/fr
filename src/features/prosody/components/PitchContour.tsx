import type { ProsodyExercise } from '../types'
import { slicePitch } from '../../../services/audio/pitch'

const HEIGHT = 90
const RANGE = 9 // semitones shown above and below the speaker's usual pitch

export interface LearnerContour {
  key: string
  label: string
  /** Semitones, resampled to the same length as the model's curve. */
  semitones: Array<number | null>
}

export interface PitchContourProps {
  exercise: Pick<ProsodyExercise, 'pitch' | 'groups'>
  /** Learner curves overlayed on the model, in the order they are shown. */
  learners?: readonly LearnerContour[]
  /** Cut the model to this segment, in seconds (the imitation segment). */
  start?: number
  end?: number
  /** Current playback time, in seconds. */
  playhead?: number | null
}

function yOf(semitones: number): number {
  return HEIGHT / 2 - (Math.max(-RANGE, Math.min(RANGE, semitones)) / RANGE) * (HEIGHT / 2 - 4)
}

/** One polyline per voiced stretch, so silence (null) never draws a bridge. */
function stretchPoints(values: ReadonlyArray<number | null>): string[] {
  const stretches: string[] = []
  let current: string[] = []
  values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 1) stretches.push(current.join(' '))
      current = []
      return
    }
    current.push(`${index},${yOf(value).toFixed(1)}`)
  })
  if (current.length > 1) stretches.push(current.join(' '))
  return stretches
}

/**
 * The model's real melody, measured on the recording, optionally cut to a
 * segment and with the learner's own curve(s) laid on top (both in semitones
 * around the speaker's usual level). "On copie une forme, pas des Hz."
 */
export function PitchContour({
  exercise,
  learners,
  start,
  end,
  playhead = null,
}: PitchContourProps) {
  const pitch = exercise.pitch
  if (!pitch || pitch.semitones.length < 2) return null

  const from = start ?? 0
  const to = end ?? pitch.semitones.length * pitch.step
  const model = slicePitch(pitch, from, to).semitones
  if (model.length < 2) return null

  const width = model.length - 1
  const x = (seconds: number) => (seconds - from) / pitch.step

  const boundaries = exercise.groups
    .filter((group) => group.end > from + 0.01 && group.end < to - 0.01)
    .map((group) => x(group.end))

  return (
    <figure className="pitch-contour">
      <svg
        viewBox={`0 0 ${width} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Courbe de hauteur de voix du modèle et de l'apprenant"
      >
        <line className="pitch-contour__mid" x1={0} x2={width} y1={HEIGHT / 2} y2={HEIGHT / 2} />
        {boundaries.map((position, index) => (
          <line
            key={`b-${index}-${position}`}
            className="pitch-contour__boundary"
            x1={position}
            x2={position}
            y1={0}
            y2={HEIGHT}
          />
        ))}
        {stretchPoints(model).map((points) => (
          <polyline key={`m-${points.slice(0, 16)}`} className="pitch-contour__line" points={points} />
        ))}
        {learners?.map((learner) =>
          stretchPoints(learner.semitones).map((points) => (
            <polyline
              key={`${learner.key}-${points.slice(0, 16)}`}
              className="pitch-contour__line pitch-contour__line--learner"
              points={points}
            />
          )),
        )}
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
        Mélodie réelle mesurée sur l'enregistrement : plus la ligne monte, plus la
        voix est aiguë.
        {learners && learners.length > 0
          ? ' Ta courbe est superposée en second plan.'
          : ' Les traits verticaux sont ses pauses.'}
      </figcaption>
    </figure>
  )
}
