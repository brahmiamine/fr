import { useEffect, useRef, useState } from 'react'
import type { AudioRecorder } from '../../hooks/useAudioRecorder'
import { getCurrentStage } from './sessionReducer'
import type { TrainingSessionState } from './types'

/** Key of the second answer to a question. */
export function retryKey(questionId: string): string {
  return `${questionId}:retry`
}
export const ZAPPING_RECORDING = 'zapping'
export const REPRISE_RECORDING = 'reprise'
export const TABOO_RECORDING = 'taboo'

/** Blob URL of each spoken answer, by key. Session-only. */
export type QuestionRecordings = Record<string, string>

/**
 * The answer being spoken right now, or null between answers: a first answer,
 * a second answer, the zapping, the subject taken up again or the taboo
 * monologue.
 */
export function speakingKey(session: TrainingSessionState | undefined): string | null {
  if (!session || session.phase !== 'active') return null
  const stage = getCurrentStage(session)
  if (stage === 'reprise') return session.reprise.stage === 'running' ? REPRISE_RECORDING : null
  if (stage === 'gaps') return session.taboo.stage === 'running' ? TABOO_RECORDING : null
  if (stage !== 'questions') return null
  if (session.zapping.stage === 'running') return ZAPPING_RECORDING
  const question = session.plan.questions[session.questions.index]
  if (!question) return null
  if (session.questions.stage === 'speaking') return question.id
  if (session.questions.stage === 'retry') return retryKey(question.id)
  return null
}

/**
 * Records every spoken answer outside the 4 → 3 → 2 while it is spoken, so
 * the first answer can be heard again before the second one, and both
 * compared at the end. Follows the same "record" switch as the 4 → 3 → 2.
 */
export function useQuestionRecordings(
  recorder: AudioRecorder,
  session: TrainingSessionState | undefined,
): QuestionRecordings {
  const [recordings, setRecordings] = useState<QuestionRecordings>({})
  const pendingRef = useRef<string[]>([])

  const recordAll = session?.fluency.recordAll ?? false
  const key = speakingKey(session)
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
