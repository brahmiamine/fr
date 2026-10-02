import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProsodyExercise } from '../types'
import type { ProsodyRecorder } from '../hooks/useProsodyRecorder'
import { ListeningExercise } from './ListeningExercise'
import { ImitationExercise } from './ImitationExercise'
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
    { text: 'Franchement', start: 0, end: 2, intonation: 'level' },
    {
      text: "je pense que c'est une bonne idée",
      start: 2,
      end: 7,
      intonation: 'rise',
      finalLengthening: true,
    },
    {
      text: 'mais ça dépend',
      start: 7,
      end: 12,
      intonation: 'fall',
    },
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
    attempt1: null,
    attempt2: null,
    recordingSeconds: 0,
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    keepAsAttempt1: vi.fn(),
    keepAsAttempt2: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  }
}

describe('prosody listening alignment', () => {
  it('shows attribution and license for a bundled human recording', () => {
    render(
      <ListeningExercise
        exercise={{
          ...exercise,
          modelKind: 'recording',
          source: 'Wikimedia Commons',
          sourceUrl: 'https://commons.wikimedia.org/wiki/File:Example.ogg',
          license: 'CC-BY-SA-4.0',
          attribution: 'Locutrice exemple, via Wikimedia Commons.',
        }}
        step="meaning"
        audioSrc={audioSrc}
        meaningPlays={0}
        prosodyPlays={0}
        onAudioComplete={() => undefined}
        onNext={() => undefined}
      />,
    )

    expect(screen.getByText(/vraie voix/i)).toBeInTheDocument()
    expect(screen.getByText(/CC-BY-SA-4.0/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /source/i })).toHaveAttribute(
      'href',
      'https://commons.wikimedia.org/wiki/File:Example.ogg',
    )
  })

  it('hides the transcript and blocks progression until the first full listen', () => {
    const { container, rerender } = render(
      <ListeningExercise
        exercise={exercise}
        step="meaning"
        audioSrc={audioSrc}
        meaningPlays={0}
        prosodyPlays={0}
        onAudioComplete={() => undefined}
        onNext={() => undefined}
      />,
    )
    expect(container.querySelector('.prosody-groups')).not.toBeInTheDocument()
    expect(screen.queryByText(/bonne idée/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: "J'ai écouté" })).toBeDisabled()

    rerender(
      <ListeningExercise
        exercise={exercise}
        step="meaning"
        audioSrc={audioSrc}
        meaningPlays={1}
        prosodyPlays={0}
        onAudioComplete={() => undefined}
        onNext={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: "J'ai écouté" })).toBeEnabled()
  })

  it('does not reveal annotations before the prosody listen is completed', () => {
    const { container } = render(
      <ListeningExercise
        exercise={exercise}
        step="prosody"
        audioSrc={audioSrc}
        meaningPlays={1}
        prosodyPlays={0}
        onAudioComplete={() => undefined}
        onNext={() => undefined}
      />,
    )
    expect(container.querySelector('.prosody-groups')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Marquer le découpage/ })).toBeDisabled()
  })

  it('shows / ↑ ↓ — and offers a replay with the visible grouping', () => {
    const { container } = render(
      <ListeningExercise
        exercise={exercise}
        step="reveal"
        audioSrc={audioSrc}
        meaningPlays={1}
        prosodyPlays={1}
        onAudioComplete={() => undefined}
        onNext={() => undefined}
      />,
    )
    expect(container.querySelector('.prosody-groups')).toBeInTheDocument()
    expect(container.textContent).toContain('↑')
    expect(container.textContent).toContain('↓')
    expect(container.textContent).toContain('—')
    expect(
      screen.getByRole('button', { name: /Réécouter avec le découpage visible/ }),
    ).toBeInTheDocument()
  })

  it('highlights the word being spoken while the model plays', () => {
    const { container } = render(
      <ListeningExercise
        exercise={{ ...exercise, modelKind: 'recording' }}
        step="reveal"
        audioSrc={audioSrc}
        meaningPlays={1}
        prosodyPlays={1}
        onAudioComplete={() => undefined}
        onNext={() => undefined}
      />,
    )
    const audio = container.querySelector('audio') as HTMLAudioElement
    Object.defineProperty(audio, 'duration', { value: 10, configurable: true })
    expect(container.querySelector('.is-speaking')).not.toBeInTheDocument()

    const first = exercise.groups[0]
    audio.currentTime = (first.start + first.end) / 2
    fireEvent.timeUpdate(audio)
    const speaking = container.querySelectorAll('.prosody-groups__token.is-speaking')
    expect(speaking).toHaveLength(1)
    expect(first.text).toContain((speaking[0].textContent ?? '').trim())

    fireEvent.ended(audio)
    expect(container.querySelector('.is-speaking')).not.toBeInTheDocument()
  })
})

describe('prosody active marking', () => {
  it('lets the learner place / and ↑ ↓ before comparing with the model', () => {
    const onMarked = vi.fn()
    render(
      <ListeningExercise
        exercise={exercise}
        step="mark"
        audioSrc={audioSrc}
        meaningPlays={1}
        prosodyPlays={1}
        onAudioComplete={() => undefined}
        onNext={() => undefined}
        onMarked={onMarked}
      />,
    )
    expect(document.querySelector('.prosody-groups')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Frontière après « Franchement »' }))
    fireEvent.click(screen.getByRole('button', { name: /Intonation de « je pense/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Comparer avec le modèle' }))

    expect(onMarked).toHaveBeenCalledWith({
      boundaries: [0],
      intonations: ['level', 'rise'],
    })
  })

  it('scores the learner marking against the model on reveal', () => {
    render(
      <ListeningExercise
        exercise={exercise}
        step="reveal"
        audioSrc={audioSrc}
        meaningPlays={1}
        prosodyPlays={1}
        marking={{ boundaries: [0, 7], intonations: ['level', 'rise', 'fall'] }}
        onAudioComplete={() => undefined}
        onNext={() => undefined}
      />,
    )
    expect(screen.getByText(/Frontières trouvées : 2\/2/)).toBeInTheDocument()
    expect(screen.getByText(/intonation juste sur 3\/3/)).toBeInTheDocument()
  })
})

describe('prosody imitation alignment', () => {
  it('requires two complete model listens before V1', () => {
    render(
      <ImitationExercise
        exercise={exercise}
        step="listen"
        modelPlays={1}
        shadowPlays={0}
        audioSrc={audioSrc}
        recorder={mockRecorder()}
        onModelPlayed={() => undefined}
        onListened={() => undefined}
        onRecorded={() => undefined}
        onShadowPlayed={() => undefined}
        onShadowDone={() => undefined}
      />,
    )
    expect(
      screen.getByRole('button', { name: /Enregistrer mon imitation/ }),
    ).toBeDisabled()
  })

  it('requires one complete shadowing pass before comparison', () => {
    render(
      <ImitationExercise
        exercise={exercise}
        step="shadow"
        modelPlays={2}
        shadowPlays={0}
        audioSrc={audioSrc}
        recorder={mockRecorder()}
        onModelPlayed={() => undefined}
        onListened={() => undefined}
        onRecorded={() => undefined}
        onShadowPlayed={() => undefined}
        onShadowDone={() => undefined}
      />,
    )
    expect(
      screen.getByRole('button', { name: /Continuer vers la comparaison/ }),
    ).toBeDisabled()
  })

  it('does not allow the model to play while the microphone is recording', () => {
    render(
      <ImitationExercise
        exercise={exercise}
        step="record"
        modelPlays={2}
        shadowPlays={0}
        audioSrc={audioSrc}
        recorder={mockRecorder({ status: 'recording' })}
        onModelPlayed={() => undefined}
        onListened={() => undefined}
        onRecorded={() => undefined}
        onShadowPlayed={() => undefined}
        onShadowDone={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: /Réécouter le segment/ })).toBeDisabled()
  })
})

describe('prosody comparison alignment', () => {
  it('keeps A/B/A inaccessible without V1', () => {
    render(
      <ComparisonExercise
        exercise={exercise}
        step="aba"
        focus={null}
        abaCompleted={false}
        audioSrc={audioSrc}
        recorder={mockRecorder()}
        onAbaComplete={() => undefined}
        onAbaDone={() => undefined}
        onChooseFocus={() => undefined}
        onRetryDone={() => undefined}
        onCompareDone={() => undefined}
      />,
    )
    expect(screen.getByText(/Enregistre d'abord ton imitation/)).toBeInTheDocument()
  })

  it('requires the automatic A/B/A sequence before continuing', () => {
    const { rerender } = render(
      <ComparisonExercise
        exercise={exercise}
        step="aba"
        focus={null}
        abaCompleted={false}
        audioSrc={audioSrc}
        recorder={mockRecorder({ attempt1: recording('blob:v1') })}
        onAbaComplete={() => undefined}
        onAbaDone={() => undefined}
        onChooseFocus={() => undefined}
        onRetryDone={() => undefined}
        onCompareDone={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: /J'ai comparé/ })).toBeDisabled()

    rerender(
      <ComparisonExercise
        exercise={exercise}
        step="aba"
        focus={null}
        abaCompleted
        audioSrc={audioSrc}
        recorder={mockRecorder({ attempt1: recording('blob:v1') })}
        onAbaComplete={() => undefined}
        onAbaDone={() => undefined}
        onChooseFocus={() => undefined}
        onRetryDone={() => undefined}
        onCompareDone={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: /J'ai comparé/ })).toBeEnabled()
  })

  it('keeps correction disabled until a single focus is chosen', () => {
    render(
      <ComparisonExercise
        exercise={exercise}
        step="choose-focus"
        focus={null}
        abaCompleted
        audioSrc={audioSrc}
        recorder={mockRecorder()}
        onAbaComplete={() => undefined}
        onAbaDone={() => undefined}
        onChooseFocus={() => undefined}
        onRetryDone={() => undefined}
        onCompareDone={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeDisabled()
    fireEvent.click(screen.getByLabelText(/Je coupe au mauvais endroit/))
    expect(screen.getByRole('button', { name: 'Continuer' })).toBeEnabled()
  })

  it('uses the model contour for an intonation correction', () => {
    render(
      <ComparisonExercise
        exercise={exercise}
        step="retry"
        focus="intonation"
        abaCompleted
        audioSrc={audioSrc}
        recorder={mockRecorder()}
        onAbaComplete={() => undefined}
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
          current: recording('blob:current'),
          start,
        })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Refaire l'enregistrement/i }))
    expect(start).toHaveBeenCalledTimes(1)
  })
})

describe('prosody retelling alignment', () => {
  it('hides model audio and transcript during the prompt', () => {
    const { container } = render(
      <RetellingExercise
        exercise={exercise}
        step="prompt"
        recorder={mockRecorder()}
        durationSeconds={0}
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

  it('requires at least 30 seconds before accepting the retelling', () => {
    const { rerender } = render(
      <RetellingExercise
        exercise={exercise}
        step="record"
        recorder={mockRecorder({
          status: 'stopped',
          current: recording('blob:retell', 29),
        })}
        durationSeconds={0}
        onStart={() => undefined}
        onRecorded={() => undefined}
        onDone={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: "J'ai terminé" })).toBeDisabled()

    rerender(
      <RetellingExercise
        exercise={exercise}
        step="record"
        recorder={mockRecorder({
          status: 'stopped',
          current: recording('blob:retell', 30),
        })}
        durationSeconds={0}
        onStart={() => undefined}
        onRecorded={() => undefined}
        onDone={() => undefined}
      />,
    )
    expect(screen.getByRole('button', { name: "J'ai terminé" })).toBeEnabled()
  })
})
