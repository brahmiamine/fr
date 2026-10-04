import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import type { TrainingSessionState } from './types'
import { useFluencyRecordings } from './useFluencyRecordings'

type Fluency = TrainingSessionState['fluency']

class FakeRecorder {
  static started = 0
  state: 'inactive' | 'recording' = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  start() {
    this.state = 'recording'
    FakeRecorder.started += 1
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['x']) })
    // Like a browser, report the blob asynchronously.
    setTimeout(() => this.onstop?.(), 0)
  }
}

let urlCount = 0

beforeEach(() => {
  FakeRecorder.started = 0
  urlCount = 0
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  const track = { readyState: 'live', stop: vi.fn() }
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
    configurable: true,
  })
  URL.createObjectURL = vi.fn(() => `blob:round-${(urlCount += 1)}`)
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function fluency(roundIndex: number, stage: Fluency['stage']): Fluency {
  return { roundIndex, stage, keywords: [], recordAll: true }
}

describe('useFluencyRecordings with the real recorder', () => {
  it('records each of the four rounds', async () => {
    const { result, rerender } = renderHook(
      ({ state }) => {
        const recorder = useAudioRecorder({ keepStream: true })
        return useFluencyRecordings(recorder, state)
      },
      { initialProps: { state: fluency(0, 'running') } },
    )
    await waitFor(() => expect(FakeRecorder.started).toBe(1))

    for (const round of [1, 2, 3]) {
      await act(async () => {
        rerender({ state: fluency(round, 'running') })
      })
      await waitFor(() => expect(FakeRecorder.started).toBe(round + 1))
    }
    await act(async () => {
      rerender({ state: fluency(3, 'summary') })
    })

    await waitFor(() => expect(Object.keys(result.current)).toHaveLength(4))
    expect(Object.keys(result.current)).toEqual(['0', '1', '2', '3'])
  })
})
