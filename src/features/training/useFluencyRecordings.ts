import { useEffect, useRef, useState } from 'react'
import type { AudioRecorder } from '../../hooks/useAudioRecorder'
import type { TrainingSessionState } from './types'

/** Blob URL of each round, by round index. Session-only: nothing survives a reload. */
export type RoundRecordings = Record<number, string>

/**
 * Records every 4 → 3 → 2 round while it runs and keeps the blob URL of each one,
 * so the end-of-exercise summary can replay them side by side.
 */
export function useFluencyRecordings(
  recorder: AudioRecorder,
  fluency: TrainingSessionState['fluency'] | undefined,
): RoundRecordings {
  const [recordings, setRecordings] = useState<RoundRecordings>({})
  // The round being stopped, remembered synchronously: the recorder reports its
  // blob back later, possibly once the next round already started.
  const stoppedRoundRef = useRef<number | null>(null)

  const recordAll = fluency?.recordAll ?? false
  const stage = fluency?.stage
  const roundIndex = fluency?.roundIndex ?? 0
  const { blobUrl, start, status, stop, supported } = recorder

  useEffect(() => {
    if (!recordAll || !supported || stage !== 'running') return
    void start()
    return () => {
      stoppedRoundRef.current = roundIndex
      stop()
    }
  }, [recordAll, supported, stage, roundIndex, start, stop])

  useEffect(() => {
    const finishedRound = stoppedRoundRef.current
    if (status !== 'stopped' || !blobUrl || finishedRound === null) return
    stoppedRoundRef.current = null
    setRecordings((previous) => ({ ...previous, [finishedRound]: blobUrl }))
  }, [status, blobUrl])

  return recordings
}
