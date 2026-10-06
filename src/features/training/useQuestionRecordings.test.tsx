import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AudioRecorder } from '../../hooks/useAudioRecorder'
import type { Question } from '../../types/content'
import type { TrainingSessionState } from './types'
import { ZAPPING_RECORDING, retryKey, useQuestionRecordings } from './useQuestionRecordings'

const questions = [
  { id: 'q1', text: 'Q1', category: 'travail', difficulty: 'easy' },
  { id: 'q2', text: 'Q2', category: 'voyage', difficulty: 'easy' },
] as Question[]

function session(
  index: number,
  stage: TrainingSessionState['questions']['stage'],
  zapping: TrainingSessionState['zapping'] = { stage: 'intro', index: 0 },
  recordAll = true,
): TrainingSessionState {
  return {
    phase: 'active',
    stageIndex: 3,
    plan: { questions, zappingQuestions: questions, gapItems: [], skippedStages: [] },
    fluency: { roundIndex: 3, stage: 'summary', keywords: [], recordAll },
    reprise: { stage: 'intro' },
    questions: { index, stage },
    zapping,
    taboo: { stage: 'intro', rating: null },
  } as unknown as TrainingSessionState
}

function recorderFactory() {
  let recording = false
  const start = vi.fn(async () => {
    recording = true
  })
  const stop = vi.fn(() => {
    const was = recording
    recording = false
    return was
  })
  const make = (blobUrl: string | null): AudioRecorder => ({
    status: 'idle',
    supported: true,
    blobUrl,
    start,
    stop,
    reset: () => undefined,
    release: () => undefined,
  })
  return { start, make }
}

describe('useQuestionRecordings', () => {
  it('records the first and second answer of each question, then the zapping', () => {
    const { start, make } = recorderFactory()
    const { result, rerender } = renderHook(
      ({ recorder, state }) => useQuestionRecordings(recorder, state),
      { initialProps: { recorder: make(null), state: session(0, 'speaking') } },
    )
    rerender({ recorder: make(null), state: session(0, 'rate') })
    rerender({ recorder: make('blob:q1'), state: session(0, 'rate') })
    rerender({ recorder: make('blob:q1'), state: session(0, 'retry') })
    rerender({ recorder: make('blob:q1'), state: session(1, 'countdown') })
    rerender({ recorder: make('blob:q1-retry'), state: session(1, 'countdown') })
    rerender({ recorder: make('blob:q1-retry'), state: session(2, 'countdown', { stage: 'running', index: 0 }) })
    rerender({ recorder: make('blob:q1-retry'), state: session(2, 'countdown', { stage: 'done', index: 2 }) })
    rerender({ recorder: make('blob:zapping'), state: session(2, 'countdown', { stage: 'done', index: 2 }) })

    expect(start).toHaveBeenCalledTimes(3)
    expect(result.current).toEqual({
      q1: 'blob:q1',
      [retryKey('q1')]: 'blob:q1-retry',
      [ZAPPING_RECORDING]: 'blob:zapping',
    })
  })

  it('follows the record switch of the session', () => {
    const { start, make } = recorderFactory()
    renderHook(() => useQuestionRecordings(make(null), session(0, 'speaking', undefined, false)))
    expect(start).not.toHaveBeenCalled()
  })
})
