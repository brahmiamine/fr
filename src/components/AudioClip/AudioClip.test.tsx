import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AudioClip } from './AudioClip'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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

  it('plays a browser speech model when speechText is provided', async () => {
    class MockUtterance {
      text: string
      lang = ''
      rate = 1
      voice: SpeechSynthesisVoice | null = null
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null

      constructor(text: string) {
        this.text = text
      }
    }

    const speak = vi.fn((utterance: MockUtterance) => {
      utterance.onstart?.()
      utterance.onend?.()
    })
    const cancel = vi.fn()

    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak, cancel, getVoices: () => [] },
    })

    const onComplete = vi.fn()
    render(
      <AudioClip
        speechText="Bonjour, je parle français."
        speechLocale="fr-FR"
        label="Écouter"
        onComplete={onComplete}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Écouter/i }))

    await waitFor(() => expect(speak).toHaveBeenCalledTimes(1))
    expect(speak.mock.calls[0][0].text).toBe('Bonjour, je parle français.')
    expect(speak.mock.calls[0][0].lang).toBe('fr-FR')
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

  it('fills the waveform as the audio advances and seeks on click', () => {
    const { container } = render(
      <AudioClip src="/model.wav" label="Écouter" />,
    )
    const audio = container.querySelector('audio') as HTMLAudioElement
    Object.defineProperty(audio, 'duration', { value: 10, configurable: true })
    const slider = screen.getByRole('slider')
    const played = () => container.querySelectorAll('.audio-player__bar.is-played').length

    expect(played()).toBe(0)

    audio.currentTime = 5
    fireEvent.timeUpdate(audio)
    expect(slider).toHaveAttribute('aria-valuenow', '50')
    expect(played()).toBeGreaterThan(20)
    expect(played()).toBeLessThan(36)

    slider.getBoundingClientRect = () =>
      ({ left: 0, width: 200, top: 0, height: 40, right: 200, bottom: 40 }) as DOMRect
    fireEvent.click(slider, { clientX: 150 })
    expect(audio.currentTime).toBeCloseTo(7.5)
    expect(slider).toHaveAttribute('aria-valuenow', '75')

    fireEvent.ended(audio)
    expect(slider).toHaveAttribute('aria-valuenow', '100')
  })
})
