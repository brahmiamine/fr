import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProsodyRecorder } from './useProsodyRecorder'

class FakeMediaRecorder {
  state: RecordingState = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onstop: (() => void) | null = null

  constructor(_stream: MediaStream) {}

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio']) } as BlobEvent)
    this.onstop?.()
  }
}

describe('useProsodyRecorder', () => {
  let objectUrlIndex = 0
  const revokeObjectURL = vi.fn()

  beforeEach(() => {
    objectUrlIndex = 0
    revokeObjectURL.mockClear()

    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => ({
          getTracks: () => [{ stop: vi.fn() }],
        })),
      },
    })
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => `blob:prosody-${++objectUrlIndex}`),
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns to idle after keeping V1 and V2 so the next recording can start', async () => {
    const { result } = renderHook(() => useProsodyRecorder())

    await act(async () => {
      await result.current.start()
    })
    expect(result.current.status).toBe('recording')

    act(() => result.current.stop())
    expect(result.current.status).toBe('stopped')
    expect(result.current.current?.url).toBe('blob:prosody-1')

    act(() => result.current.keepAsAttempt1())
    expect(result.current.attempt1?.url).toBe('blob:prosody-1')
    expect(result.current.current).toBeNull()
    expect(result.current.status).toBe('idle')

    await act(async () => {
      await result.current.start()
    })
    expect(result.current.status).toBe('recording')

    act(() => result.current.stop())
    expect(result.current.current?.url).toBe('blob:prosody-2')

    act(() => result.current.keepAsAttempt2())
    expect(result.current.attempt2?.url).toBe('blob:prosody-2')
    expect(result.current.current).toBeNull()
    expect(result.current.status).toBe('idle')

    await act(async () => {
      await result.current.start()
    })
    expect(result.current.status).toBe('recording')
  })

  it('replaces an uncommitted take when the learner records again', async () => {
    const { result } = renderHook(() => useProsodyRecorder())

    await act(async () => {
      await result.current.start()
    })
    act(() => result.current.stop())
    expect(result.current.current?.url).toBe('blob:prosody-1')

    await act(async () => {
      await result.current.start()
    })
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:prosody-1')
    expect(result.current.current).toBeNull()

    act(() => result.current.stop())
    expect(result.current.current?.url).toBe('blob:prosody-2')
  })
})
