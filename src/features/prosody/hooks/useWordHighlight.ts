import { useCallback, useState } from 'react'
import { activeWordIndex } from '../marking'
import type { ProsodyExercise } from '../types'

/**
 * Follows the model voice word by word. Wire `onProgress` to an AudioClip playing the
 * whole excerpt; `activeIndex` is the word being spoken (-1 when idle or finished).
 */
export function useWordHighlight(exercise: Pick<ProsodyExercise, 'groups' | 'modelKind'>) {
  const [activeIndex, setActiveIndex] = useState(-1)
  const { groups, modelKind } = exercise

  const onProgress = useCallback(
    (fraction: number, seconds: number) => {
      if (fraction <= 0 || fraction >= 1 || groups.length === 0) {
        setActiveIndex(-1)
        return
      }
      // Synthesised speech has no playhead: map progress onto the excerpt timeline.
      const first = groups[0].start
      const last = groups[groups.length - 1].end
      const time = modelKind === 'tts' ? first + fraction * (last - first) : seconds
      setActiveIndex(activeWordIndex({ groups }, time))
    },
    [groups, modelKind],
  )

  return { activeIndex, onProgress }
}
