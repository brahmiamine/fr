import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProsodyExercise } from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { ListeningExercise } from './ListeningExercise'
import { ComparisonExercise } from './ComparisonExercise'
import { RetellingExercise } from './RetellingExercise'
import { RecorderControls } from './RecorderControls'

const exercise: ProsodyExercise = {
  id: 'prosody_test',
  level: 'B1',
  category: 'opinion',
  audio: 'audio/prosody/prosody_test.wav',
  transcript: "Franchement, je pense que c'est une bonne idée, mais ça dépend.",
  groups: [
    { text: 'Franchement', start: 0, end: 0.7, intonation: 'level' },
    {
      text: "je pense que c'est une bonne idée",
      start: 0.7,
      end: 3.1,
      intonation: 'rise',
      finalLengthening: true,
    },
    {
      text: 'mais ça dépend',
      start: 3.1,
      end: 5.4,
      intonation: 'fall',
    },
  ],
  imitation: { start: 0.7, end: 5.4 },
  retelling: { idea: 'Donner une opinion positive puis la nuancer.' },
}

const audioSrc = '/audio/prosody/prosody_test.wav'

function mockRecorder(overrides: Partial<ProsodyRecorder> = {}): ProsodyRecorder {
  return {
    status: 'idle',
    supported: true,
    current: null,
    attempt1: null,
    attempt2: null,
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    keepAsAttempt1: vi.fn(),
    keepAsAttempt2: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  }
}

describe('prosody listening alignment', () => {
  it('hides the transcript on the first listen', () => {
    const { container } = render(
      <ListeningExercise
        exercise={exercise}
        step="meaning"
        audioSrc={audioSrc}
        onNext={() => undefined}
      />,
    )
    expect(container.querySelector('.prosody-groups')).not.toBeInTheDocument()
    expect(screen.queryByText(/bonne idée/)).not.toBeInTheDocument()
  })

  it('does not reveal the annotations before the reveal step', () => {
    const { container } = render(
      <ListeningExercise
        exercise={exercise}
        step="prosody"
        audioSrc={audioSrc}
        onNext={() => undefined}
      />,
    )
    expect(container.querySelector('.prosody-groups')).not.toBeInTheDocument()
  })

  it('shows the grouped transcript with / ↑ ↓ marks after reveal', () => {
    const { container } = render(
      <ListeningExercise
        exercise={exercise}
        step="reveal"
        audioSrc={audioSrc}
        onNext={() => undefined}
      />,
    )
    expect(container.querySelector('.prosody-groups')).toBeInTheDocument()
    expect(container.textContent).toContain('↑')
    expect(container.textContent).toContain('↓')
    expect(container.textContent).toContain('—')
  })
})

describe('prosody A/B/A alignment', () => {
  it('keeps the comparison inaccessible without a recorded attempt', () => {
    render(
      <ComparisonExercise
        exercise={exercise}
        step="aba"
        focus={null}
        audioSrc={audioSrc}
        recorder={mockRecorder({ attempt1: null })}
        onAbaDone={() => undefined}
        onChooseFocus={() => undefined}
        onRetryDone={() => undefined}
        onCompareDone={() => undefined}
      />,
    )
    expect(screen.getByText(/Enregistre d'abord ton imitation/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /J'ai comparé/ }),
    ).not.toBeInTheDocument()
  })

  it('makes the comparison available once V1 is recorded', () => {
    render(
      <ComparisonExercise
        exercise={exercise}
        step="aba"
        focus={null}
        audioSrc={audioSrc}
        recorder={mockRecorder({ attempt1: { blob: new Blob(), url: 'blob:v1' } })}
        onAbaDone={() => undefined}
        onChooseFocus={() => undefined}
        onRetryDone={() => undefined}
        onCompareDone={() => undefined}
      />,
    )
    expect(
      screen.getByRole('button', { name: /J'ai comparé/ }),
    ).toBeInTheDocument()
  })

  it('keeps the retry step disabled until a focus is chosen', () => {
    render(
      <ComparisonExercise
        exercise={exercise}
        step="choose-focus"
        focus={null}
        audioSrc={audioSrc}
        recorder={mockRecorder()}
        onAbaDone={() => undefined}
        onChooseFocus={() => undefined}
        onRetryDone={() => undefined}
        onCompareDone={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled()
  })

  it('shows a single positive correction goal and allows V2 after choosing a focus', () => {
    render(
      <ComparisonExercise
        exercise={exercise}
        step="retry"
        focus="pause"
        audioSrc={audioSrc}
        recorder={mockRecorder({ current: { blob: new Blob(), url: 'blob:v2' } })}
        onAbaDone={() => undefined}
        onChooseFocus={() => undefined}
        onRetryDone={() => undefined}
        onCompareDone={() => undefined}
      />,
    )
    expect(
      screen.getByText(/Ne coupe pas le groupe au mauvais endroit/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /J'ai refait \(V2\)/ }),
    ).toBeEnabled()
  })

  it('uses the model contour for the intonation correction goal', () => {
    render(
      <ComparisonExercise
        exercise={exercise}
        step="retry"
        focus="intonation"
        audioSrc={audioSrc}
        recorder={mockRecorder()}
        onAbaDone={() => undefined}
        onChooseFocus={() => undefined}
        onRetryDone={() => undefined}
        onCompareDone={() => undefined}
      />,
    )
    expect(screen.getByText(/→ ↑ ↓/)).toBeInTheDocument()
  })

  it('offers a retake after a stopped recording', () => {
    const start = vi.fn(async () => undefined)
    render(
      <RecorderControls
        recorder={mockRecorder({
          status: 'stopped',
          current: { blob: new Blob(), url: 'blob:current' },
          start,
        })}
      />,
    )
    fireEvent.click(
      screen.getByRole('button', { name: /Refaire l'enregistrement/i }),
    )
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('reveals the correction after selecting a focus', () => {
    render(
      <ComparisonExercise
        exercise={exercise}
        step="choose-focus"
        focus={null}
        audioSrc={audioSrc}
        recorder={mockRecorder()}
        onAbaDone={() => undefined}
        onChooseFocus={() => undefined}
        onRetryDone={() => undefined}
        onCompareDone={() => undefined}
      />,
    )
    fireEvent.click(screen.getByLabelText(/Je coupe au mauvais endroit/))
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeEnabled()
  })
})

describe('prosody retelling alignment', () => {
  it('hides the model audio and transcript during the retelling prompt', () => {
    const { container } = render(
      <RetellingExercise
        exercise={exercise}
        step="prompt"
        recorder={mockRecorder()}
        onStart={() => undefined}
        onRecorded={() => undefined}
        onDone={() => undefined}
      />,
    )
    expect(container.querySelector('audio')).not.toBeInTheDocument()
    expect(screen.queryByText(/bonne idée/)).not.toBeInTheDocument()
    expect(
      screen.getByText('Donner une opinion positive puis la nuancer.'),
    ).toBeInTheDocument()
  })
})
