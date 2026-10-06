import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AudioRecorder } from '../../hooks/useAudioRecorder'
import type { Question } from '../../types/content'
import type { TrainingSessionState } from './types'
import { REVENGE_RECORDING, useQuestionRecordings } from './useQuestionRecordings'

const questions = [
  { id: 'q1', text: 'Q1', category: 'travail', difficulty: 'easy' },
  { id: 'q2', text: 'Q2', category: 'voyage', difficulty: 'easy' },
] as Question[]

function session(
  index: number,
  stage: TrainingSessionState['questions']['stage'],
  revenge: TrainingSessionState['revenge'] = { questionId: null, stage: 'idle' },
  recordAll = true,
): TrainingSessionState {
  return {
    phase: 'active',
    plan: { questions },
    fluency: { roundIndex: 3, stage: 'summary', keywords: [], recordAll },
    questions: { index, stage },
    revenge,
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
  it('records each answer and the revenge, matched by question', () => {
    const { start, make } = recorderFactory()
    const { result, rerender } = renderHook(
      ({ recorder, state }) => useQuestionRecordings(recorder, state, true),
      { initialProps: { recorder: make(null), state: session(0, 'speaking') } },
    )
    rerender({ recorder: make(null), state: session(0, 'rate') })
    rerender({ recorder: make('blob:q1'), state: session(0, 'rate') })
    rerender({ recorder: make('blob:q1'), state: session(1, 'speaking') })
    rerender({ recorder: make('blob:q1'), state: session(1, 'rate') })
    rerender({ recorder: make('blob:q2'), state: session(1, 'rate') })
    const revenge = { questionId: 'q2', stage: 'speaking' as const }
    rerender({ recorder: make('blob:q2'), state: session(1, 'rate', revenge) })
    rerender({ recorder: make('blob:q2'), state: session(1, 'rate', { ...revenge, stage: 'done' }) })
    rerender({ recorder: make('blob:revenge'), state: session(1, 'rate', { ...revenge, stage: 'done' }) })

    expect(start).toHaveBeenCalledTimes(3)
    expect(result.current).toEqual({ q1: 'blob:q1', q2: 'blob:q2', [REVENGE_RECORDING]: 'blob:revenge' })
  })

  it('follows the record switch of the session', () => {
    const { start, make } = recorderFactory()
    renderHook(() =>
      useQuestionRecordings(make(null), session(0, 'speaking', undefined, false), true),
    )
    expect(start).not.toHaveBeenCalled()
  })
})
