import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FluencyReady } from './FluencyReady'
import type { Topic } from '../../../../types/content'

const topic = {
  id: 't1',
  title: 'Parle de ton travail',
  transferPrompt: 'Parle de ton week-end',
  prompts: [],
} as unknown as Topic

const feedback = {
  missingWord: '',
  missingWordContext: '',
  difficultPhrase: '',
  importantError: 'Attention à depuis',
  missedChunk: '',
  missedChunkIntent: '',
}

describe('FluencyReady', () => {
  it('shows the prompt and starts the round only when asked', () => {
    const onBegin = vi.fn()
    render(<FluencyReady topic={topic} roundIndex={1} feedback={feedback} onBegin={onBegin} />)

    expect(screen.getByText('Parle de ton travail')).toBeTruthy()
    expect(screen.getByText('Attention à depuis')).toBeTruthy()
    expect(onBegin).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /prêt/i }))
    expect(onBegin).toHaveBeenCalledTimes(1)
  })
})
