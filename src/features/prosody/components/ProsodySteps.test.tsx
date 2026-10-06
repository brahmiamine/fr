import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProsodyExercise } from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { ColdExercise } from './ColdExercise'
import { ChorusLoop } from './ChorusLoop'
import { MemoryStep } from './MemoryStep'

const exercise: ProsodyExercise = {
  id: 'prosody_test',
  level: 'B1',
  category: 'opinion',
  modelKind: 'recording',
  annotation: 'acoustic',
  audio: 'audio/prosody/prosody_test.wav',
  transcript: "Franchement, je pense que c'est une bonne idée, mais ça dépend.",
  groups: [
    { text: 'Franchement', start: 0, end: 2, intonation: 'level', intonationMeasured: true },
    { text: "je pense que c'est une bonne idée", start: 2, end: 7, intonation: 'rise', intonationMeasured: true },
    { text: 'mais ça dépend', start: 7, end: 12, intonation: 'fall', intonationMeasured: true },
  ],
  imitation: { start: 2, end: 9 },
  retelling: { idea: 'Donner une opinion positive puis la nuancer.' },
  ready: true,
  source: 'test',
}

const audioSrc = '/audio/prosody/prosody_test.wav'

function recording(url: string, durationSeconds = 7) {
  return { blob: new Blob(), url, durationSeconds }
}

function mockRecorder(overrides: Partial<ProsodyRecorder> = {}): ProsodyRecorder {
  return {
    status: 'idle',
    supported: true,
    current: null,
    cold: null,
    attempt1: null,
    attempt2: null,
    recordingSeconds: 0,
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    keepAsCold: vi.fn(),
    keepAsAttempt1: vi.fn(),
    keepAsAttempt2: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  }
}

describe('ColdExercise', () => {
  it('keeps the cold version without revealing the transcript', () => {
    const keepAsCold = vi.fn()
    const onRecorded = vi.fn()
    const { container } = render(
      <ColdExercise
        exercise={exercise}
        recorder={mockRecorder({ current: recording('blob:cold'), keepAsCold })}
        onRecorded={onRecorded}
      />,
    )
    expect(container.querySelector('audio')).not.toBeInTheDocument()
    expect(screen.queryByText(/bonne idée/)).not.toBeInTheDocument()
    expect(screen.getByText('Donner une opinion positive puis la nuancer.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Garder cette version à froid/ }))
    expect(keepAsCold).toHaveBeenCalledTimes(1)
    expect(onRecorded).toHaveBeenCalledTimes(1)
  })
})

describe('ChorusLoop', () => {
  it('starts with a listen-only pass and blocks the memory step until six passes', () => {
    render(
      <ChorusLoop
        exercise={exercise}
        audioSrc={audioSrc}
        onPass={() => undefined}
        onDone={() => undefined}
      />,
    )
    expect(screen.getByText(/passe 1\/6/)).toBeInTheDocument()
    expect(screen.getByText(/écoute seule/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuer vers la mémoire/ })).toBeDisabled()
  })
})

describe('MemoryStep', () => {
  it('listens once, then enforces the 2-second silence before recall', () => {
    const { container } = render(
      <MemoryStep
        exercise={exercise}
        audioSrc={audioSrc}
        recorder={mockRecorder()}
        onDone={() => undefined}
      />,
    )
    expect(screen.getByText(/Écoute une dernière fois/)).toBeInTheDocument()

    const audio = container.querySelector('audio') as HTMLAudioElement
    fireEvent.ended(audio)
    expect(screen.getByText(/Silence… 2 s/)).toBeInTheDocument()
  })
})
