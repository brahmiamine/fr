import { useEffect, useState } from 'react'
import type { ProsodyExercise } from '../types'
import type { ProsodyRecorder } from './useProsodyRecorder'
import { learnerMelody, modelPitchFor } from '../melody'
import type { LearnerMelody } from '../melody'
import type { PitchCurve } from '../../../services/audio/pitch'

export interface MelodyComparison {
  model: PitchCurve | null
  v1: LearnerMelody
  v2: LearnerMelody
  cold: LearnerMelody
}

const EMPTY: LearnerMelody = { curve: null, distance: null }

/**
 * Measures the learner's V1/V2/cold curves against the model (cut to the
 * imitation segment). Synthetic models have no curve, so everything stays null.
 */
export function useMelodyComparison(
  exercise: ProsodyExercise,
  recorder: ProsodyRecorder,
): MelodyComparison {
  const [result, setResult] = useState<MelodyComparison>(() => ({
    model: modelPitchFor(exercise),
    v1: EMPTY,
    v2: EMPTY,
    cold: EMPTY,
  }))

  useEffect(() => {
    let cancelled = false
    const model = modelPitchFor(exercise)
    const urls = [
      recorder.attempt1?.url,
      recorder.attempt2?.url,
      recorder.cold?.url,
    ]
    setResult({ model, v1: EMPTY, v2: EMPTY, cold: EMPTY })
    Promise.all(urls.map((url) => learnerMelody(model, url))).then(([v1, v2, cold]) => {
      if (cancelled) return
      setResult({ model, v1, v2, cold })
    })
    return () => {
      cancelled = true
    }
  }, [exercise, recorder.attempt1?.url, recorder.attempt2?.url, recorder.cold?.url])

  return result
}
