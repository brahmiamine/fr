import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAudioRecorder } from './useAudioRecorder'

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
    this.onstop?.()
  }
}

beforeEach(() => {
  FakeRecorder.started = 0
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  const track = { readyState: 'live', stop: vi.fn() }
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
    configurable: true,
  })
  URL.createObjectURL = vi.fn(() => `blob:${FakeRecorder.started}`)
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAudioRecorder', () => {
  it('starts a new recording after a previous one was stopped', async () => {
    const { result } = renderHook(() => useAudioRecorder({ keepStream: true }))

    await act(async () => result.current.start())
    await waitFor(() => expect(result.current.status).toBe('recording'))
    act(() => {
      result.current.stop()
    })
    await waitFor(() => expect(result.current.status).toBe('stopped'))

    await act(async () => result.current.start())
    await waitFor(() => expect(result.current.status).toBe('recording'))
    expect(FakeRecorder.started).toBe(2)
  })
})
