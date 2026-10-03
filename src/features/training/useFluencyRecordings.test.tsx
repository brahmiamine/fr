import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AudioRecorder } from '../../hooks/useAudioRecorder'
import type { TrainingSessionState } from './types'
import { useFluencyRecordings } from './useFluencyRecordings'

type Fluency = TrainingSessionState['fluency']

function fluency(roundIndex: number, stage: Fluency['stage']): Fluency {
  return { roundIndex, stage, keywords: [], recordAll: true }
}

describe('useFluencyRecordings', () => {
  it('starts a fresh recording at every round and matches each blob to its round', () => {
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

    const { result, rerender } = renderHook(
      ({ recorder, state }) => useFluencyRecordings(recorder, state),
      { initialProps: { recorder: make(null), state: fluency(0, 'running') } },
    )
    expect(start).toHaveBeenCalledTimes(1)

    // Round 1 ends (mini feedback), its blob arrives.
    rerender({ recorder: make(null), state: fluency(0, 'feedback') })
    rerender({ recorder: make('blob:round-1'), state: fluency(0, 'feedback') })

    // Rounds 2, 3, 4 run back to back: each one must start its own recording.
    rerender({ recorder: make('blob:round-1'), state: fluency(1, 'running') })
    rerender({ recorder: make('blob:round-1'), state: fluency(2, 'running') })
    rerender({ recorder: make('blob:round-2'), state: fluency(2, 'running') })
    rerender({ recorder: make('blob:round-2'), state: fluency(3, 'running') })
    rerender({ recorder: make('blob:round-3'), state: fluency(3, 'running') })
    act(() => {
      rerender({ recorder: make('blob:round-3'), state: fluency(3, 'summary') })
    })
    rerender({ recorder: make('blob:round-4'), state: fluency(3, 'summary') })

    expect(start).toHaveBeenCalledTimes(4)
    expect(result.current).toEqual({
      0: 'blob:round-1',
      1: 'blob:round-2',
      2: 'blob:round-3',
      3: 'blob:round-4',
    })
  })

  it('records nothing when the switch is off', () => {
    const start = vi.fn(async () => undefined)
    const recorder: AudioRecorder = {
      status: 'idle',
      supported: true,
      blobUrl: null,
      start,
      stop: () => false,
      reset: () => undefined,
      release: () => undefined,
    }
    renderHook(() =>
      useFluencyRecordings(recorder, { ...fluency(0, 'running'), recordAll: false }),
    )
    expect(start).not.toHaveBeenCalled()
  })
})
