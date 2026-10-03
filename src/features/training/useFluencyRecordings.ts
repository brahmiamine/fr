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
  // Rounds whose recording is being stopped, oldest first. The recorder reports
  // each blob back later, possibly once the next round already started, so the
  // blobs are matched to rounds in order.
  const pendingRoundsRef = useRef<number[]>([])

  const recordAll = fluency?.recordAll ?? false
  const stage = fluency?.stage
  const roundIndex = fluency?.roundIndex ?? 0
  const { blobUrl, start, stop, supported } = recorder

  // One fresh recording per round, started as the round starts.
  useEffect(() => {
    if (!recordAll || !supported || stage !== 'running') return
    void start()
    return () => {
      if (stop()) pendingRoundsRef.current.push(roundIndex)
    }
  }, [recordAll, supported, stage, roundIndex, start, stop])

  useEffect(() => {
    if (!blobUrl) return
    const finishedRound = pendingRoundsRef.current.shift()
    if (finishedRound === undefined) return
    setRecordings((previous) => ({ ...previous, [finishedRound]: blobUrl }))
  }, [blobUrl])

  return recordings
}
