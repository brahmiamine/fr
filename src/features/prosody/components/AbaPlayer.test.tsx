import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AbaPlayer } from './AbaPlayer'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AbaPlayer', () => {
  it('plays model → learner → model and only then completes', async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const onComplete = vi.fn()

    const { container } = render(
      <AbaPlayer
        modelSrc="/model.wav"
        learnerSrc="blob:learner"
        start={2}
        end={5}
        onComplete={onComplete}
      />,
    )
    const [model, learner] = Array.from(container.querySelectorAll('audio'))

    fireEvent.click(
      screen.getByRole('button', { name: /Comparer automatiquement A → B → A/ }),
    )
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1))

    model.currentTime = 5
    fireEvent.timeUpdate(model)
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2))
    expect(onComplete).not.toHaveBeenCalled()

    fireEvent.ended(learner)
    await waitFor(() => expect(play).toHaveBeenCalledTimes(3))

    model.currentTime = 5
    fireEvent.timeUpdate(model)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
