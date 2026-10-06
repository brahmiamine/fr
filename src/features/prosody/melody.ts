import {
  dtwDistance,
  pitchOfRecording,
  resample,
  slicePitch,
  trimUnvoiced,
} from '../../services/audio/pitch'
import type { PitchCurve } from '../../services/audio/pitch'
import type { ProsodyExercise } from './types'

export interface LearnerMelody {
  /** The learner's curve, trimmed and resampled to the model's length. */
  curve: PitchCurve | null
  /** DTW distance to the model, in semitones (smaller = closer). */
  distance: number | null
}

/**
 * The model's melody cut to the imitation segment. Synthetic voices have no
 * measured curve, so there is nothing to compare against.
 */
export function modelPitchFor(exercise: ProsodyExercise): PitchCurve | null {
  if (!exercise.pitch || exercise.modelKind === 'tts') return null
  return slicePitch(exercise.pitch, exercise.imitation.start, exercise.imitation.end)
}

/** Measures a learner recording against the model and returns its curve + distance. */
export async function learnerMelody(
  model: PitchCurve | null,
  url: string | undefined,
): Promise<LearnerMelody> {
  if (!model || !url) return { curve: null, distance: null }
  const curve = await pitchOfRecording(url)
  if (!curve) return { curve: null, distance: null }
  const resampled = resample(trimUnvoiced(curve.semitones), model.semitones.length)
  return {
    curve: { step: model.step, semitones: resampled },
    distance: dtwDistance(model.semitones, resampled),
  }
}
