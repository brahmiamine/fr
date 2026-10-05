import { useEffect, useRef, useState } from 'react'
import type { AudioRecorder } from '../../hooks/useAudioRecorder'
import type { TrainingSessionState } from './types'

/** Key of the second answer to the worst question. */
export const REVENGE_RECORDING = 'revenge'

/** Blob URL of each spoken answer, by question id (and `revenge`). Session-only. */
export type QuestionRecordings = Record<string, string>

/** The answer being spoken right now, or null between answers. */
function speakingKey(session: TrainingSessionState | undefined): string | null {
  if (!session || session.phase !== 'active') return null
  if (session.revenge.stage === 'speaking') return REVENGE_RECORDING
  if (session.revenge.stage !== 'idle') return null
  if (session.questions.stage !== 'speaking') return null
  return session.plan.questions[session.questions.index]?.id ?? null
}

/**
 * Records every surprise-question answer while it is spoken, so the worst one
 * can be heard again before the revenge, and both versions compared at the end.
 * Follows the same "record" switch as the 4 → 3 → 2.
 */
export function useQuestionRecordings(
  recorder: AudioRecorder,
  session: TrainingSessionState | undefined,
  inQuestions: boolean,
): QuestionRecordings {
  const [recordings, setRecordings] = useState<QuestionRecordings>({})
  const pendingRef = useRef<string[]>([])

  const recordAll = session?.fluency.recordAll ?? false
  const key = inQuestions ? speakingKey(session) : null
  const { blobUrl, start, stop, supported } = recorder

  useEffect(() => {
    if (!recordAll || !supported || !key) return
    void start()
    return () => {
      if (stop()) pendingRef.current.push(key)
    }
  }, [recordAll, supported, key, start, stop])

  useEffect(() => {
    if (!blobUrl) return
    const finished = pendingRef.current.shift()
    if (finished === undefined) return
    setRecordings((previous) => ({ ...previous, [finished]: blobUrl }))
  }, [blobUrl])

  return recordings
}
