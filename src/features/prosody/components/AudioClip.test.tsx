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
})
