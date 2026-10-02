import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioClip } from './AudioClip'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AudioClip', () => {
  it('toggles between play and pause instead of restarting on the second click', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    const pause = vi
      .spyOn(HTMLMediaElement.prototype, 'pause')
      .mockImplementation(() => undefined)

    render(<AudioClip src="/model.wav" label="Écouter" />)
    const button = screen.getByRole('button', { name: /Écouter/i })

    fireEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'))
    expect(play).toHaveBeenCalledTimes(1)

    fireEvent.click(button)
    expect(pause).toHaveBeenCalledTimes(1)
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(play).toHaveBeenCalledTimes(1)
  })

  it('reports a complete full playback only on ended', () => {
    const onComplete = vi.fn()
    const { container } = render(
      <AudioClip src="/model.wav" label="Écouter" onComplete={onComplete} />,
    )
    const audio = container.querySelector('audio')
    expect(audio).toBeTruthy()
    fireEvent.ended(audio as HTMLAudioElement)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not start while disabled', () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    render(<AudioClip src="/model.wav" label="Écouter" disabled />)
    fireEvent.click(screen.getByRole('button', { name: /Écouter/i }))
    expect(play).not.toHaveBeenCalled()
  })
})
