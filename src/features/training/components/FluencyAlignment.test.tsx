import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AudioRecorder } from '../../../hooks/useAudioRecorder'
import type { Chunk, Question, Topic } from '../../../types/content'
import type { FluencyFeedback, FluencyReminder } from '../types'
import { Fluency432Exercise } from './Fluency432Exercise'
import type { Fluency432ExerciseProps } from './Fluency432Exercise'
import { SessionFeedbackView } from './SessionFeedback'
import { SurpriseQuestionsExercise } from './SurpriseQuestionsExercise'

const topic: Topic = {
  id: 't-test',
  title: 'Télétravail ou bureau ?',
  category: 'travail',
  difficulty: 'medium',
  prompts: [
    'Quel est ton choix personnel ?',
    'Quels sont les avantages ?',
    'Quels sont les inconvénients ?',
  ],
  transferPrompt: 'La semaine de quatre jours est-elle une bonne idée ?',
}

const question: Question = {
  id: 'q-a',
  text: 'Le télétravail est-il positif ?',
  category: 'travail',
  difficulty: 'medium',
}

function recorder(overrides: Partial<AudioRecorder> = {}): AudioRecorder {
  return {
    status: 'idle',
    supported: true,
    blobUrl: null,
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
    release: vi.fn(),
    ...overrides,
  }
}

const fluencyFeedback: FluencyFeedback = {
  missingWord: '',
  missingWordContext: '',
  difficultPhrase: '',
  importantError: '',
}

const fluencyProps: Fluency432ExerciseProps = {
  topic,
  roundIndex: 0,
  stage: 'prep',
  feedback: fluencyFeedback,
  keywords: [],
  chunksOfDay: [] as Chunk[],
  focusWords: [],
  fluencyReminders: [] as FluencyReminder[],
  recordAll: true,
  recordings: {},
  onKeywordsChange: () => undefined,
  onRecordAllChange: () => undefined,
  onStartRound: () => undefined,
  onRoundComplete: () => undefined,
  onSummaryDone: () => undefined,
  onSubmitFeedback: () => undefined,
}

function renderFluency(overrides: Partial<Fluency432ExerciseProps> = {}) {
  return render(<Fluency432Exercise {...fluencyProps} {...overrides} />)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('4→3→2 alignment', () => {
  it('hides preparation prompts until the learner explicitly asks for a hint', () => {
    renderFluency()

    expect(screen.queryByText('Quel est ton choix personnel ?')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /besoin d'une piste/i }))
    expect(screen.getByText('Quel est ton choix personnel ?')).toBeInTheDocument()
  })

  it('lets the learner opt into recording every round, or none at all', () => {
    const onRecordAllChange = vi.fn()
    const onStartRound = vi.fn()
    renderFluency({ recorder: recorder(), onRecordAllChange, onStartRound })

    const toggle = screen.getByLabelText(/enregistrer les 4 tours/i)
    expect(toggle).toBeChecked()

    fireEvent.click(toggle)
    expect(onRecordAllChange).toHaveBeenCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: 'Commencer le tour 1' }))
    expect(onStartRound).toHaveBeenCalledTimes(1)
  })

  it('replays every recorded round in the end-of-exercise summary', () => {
    const onSummaryDone = vi.fn()
    const { container } = renderFluency({
      roundIndex: 3,
      stage: 'summary',
      recordings: {
        0: 'blob:tour-1',
        1: 'blob:tour-2',
        2: 'blob:tour-3',
        3: 'blob:tour-4',
      },
      onSummaryDone,
    })

    expect(screen.getByRole('heading', { name: /réécoute/i })).toBeInTheDocument()
    expect(container.querySelectorAll('audio')).toHaveLength(4)
    // Once in the round pills, once as the AudioClip caption.
    expect(screen.getAllByText('Transfert — 2:00')).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Télécharger' })).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: /continuer/i }))
    expect(onSummaryDone).toHaveBeenCalledTimes(1)
  })

  it('auto-starts a running round and does not allow pausing it', () => {
    vi.useFakeTimers()
    const onRoundComplete = vi.fn()

    renderFluency({ roundIndex: 1, stage: 'running', onRoundComplete })

    expect(screen.queryByRole('button', { name: 'Démarrer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(180_000)
    })
    expect(onRoundComplete).toHaveBeenCalledTimes(1)
  })

  it('asks for a corrected formulation rather than storing the raw error', () => {
    renderFluency({ stage: 'feedback' })

    expect(
      screen.getByLabelText(/formulation corrigée à réutiliser/i),
    ).toBeInTheDocument()
  })
})

describe('surprise-question timing', () => {
  it('shows the unknown question during the 10/5/3-second preparation window', () => {
    vi.useFakeTimers()
    const onPrepDone = vi.fn()
    render(
      <SurpriseQuestionsExercise
        question={question}
        index={0}
        total={5}
        stage="prep"
        prepSeconds={5}
        chunksOfDay={[]}
        focusWords={[]}
        onCountdownDone={() => undefined}
        onPrepDone={onPrepDone}
        onSpeakingDone={() => undefined}
        onRate={() => undefined}
        onNoteChange={() => undefined}
        onNoteDone={() => undefined}
        onRetryDone={() => undefined}
      />,
    )

    expect(screen.getByText(question.text)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(onPrepDone).toHaveBeenCalledTimes(1)
  })

  it('auto-starts the 60-second answer and cannot be ended early', () => {
    vi.useFakeTimers()
    const onSpeakingDone = vi.fn()
    render(
      <SurpriseQuestionsExercise
        question={question}
        index={0}
        total={5}
        stage="speaking"
        prepSeconds={5}
        chunksOfDay={[]}
        focusWords={[]}
        onCountdownDone={() => undefined}
        onPrepDone={() => undefined}
        onSpeakingDone={onSpeakingDone}
        onRate={() => undefined}
        onNoteChange={() => undefined}
        onNoteDone={() => undefined}
        onRetryDone={() => undefined}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Démarrer' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: "J'ai terminé" })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(onSpeakingDone).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(onSpeakingDone).toHaveBeenCalledTimes(1)
  })

  it('shows springboards and the full answer structure during the preparation', () => {
    render(
      <SurpriseQuestionsExercise
        question={question}
        index={0}
        total={2}
        stage="prep"
        prepSeconds={5}
        chunksOfDay={[]}
        focusWords={[]}
        onCountdownDone={() => undefined}
        onPrepDone={() => undefined}
        onSpeakingDone={() => undefined}
        onRate={() => undefined}
        onNoteChange={() => undefined}
        onNoteDone={() => undefined}
        onRetryDone={() => undefined}
      />,
    )
    expect(screen.getByText('Position → raison → exemple → nuance → conclusion')).toBeInTheDocument()
    expect(screen.getByText('Démarre par un tremplin')).toBeInTheDocument()
  })

  it('notes what was missing for 30 seconds, then gives 60 seconds to answer again', () => {
    vi.useFakeTimers()
    const onNoteDone = vi.fn()
    const onRetryDone = vi.fn()
    const common = {
      question,
      index: 0,
      total: 2,
      prepSeconds: 3,
      chunksOfDay: [],
      focusWords: [],
      onCountdownDone: () => undefined,
      onPrepDone: () => undefined,
      onSpeakingDone: () => undefined,
      onRate: () => undefined,
      onNoteChange: () => undefined,
      onNoteDone,
      onRetryDone,
    }
    const { unmount } = render(<SurpriseQuestionsExercise {...common} stage="note" />)
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(onNoteDone).toHaveBeenCalledTimes(1)
    unmount()

    render(<SurpriseQuestionsExercise {...common} stage="retry" note="un exemple concret" speakingSeconds={90} />)
    expect(screen.getByText('un exemple concret')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(59_000)
    })
    expect(onRetryDone).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(onRetryDone).toHaveBeenCalledTimes(1)
  })
})

describe('final feedback', () => {
  it('keeps the recorded audio available for the final delayed review', () => {
    const props = {
      feedback: {
        blockedWord: '',
        blockedWordContext: '',
        abandonedSentence: '',
        awkwardPhrase: '',
        expressionToReuse: '',
        expressionIntent: '',
        blockCount: 0,
        fluencyScore: 3,
      },
      onChange: () => undefined,
      onSubmit: () => undefined,
      audioUrl: 'blob:session-audio',
    }

    const { container } = render(
      <SessionFeedbackView {...(props as any)} />,
    )

    expect(container.querySelector('audio[src="blob:session-audio"]')).toBeTruthy()
    expect(
      screen.getByLabelText(/reformulation corrigée de la phrase abandonnée/i),
    ).toBeInTheDocument()
  })

  it('requires an active confirmation before a previous correction is counted as reused', () => {
    const onToggleReminder = vi.fn()
    render(
      <SessionFeedbackView
        {...({
          feedback: {
            blockedWord: '',
            blockedWordContext: '',
            abandonedSentence: '',
            awkwardPhrase: '',
            expressionToReuse: '',
            expressionIntent: '',
            blockCount: 0,
            fluencyScore: 3,
          },
          onChange: () => undefined,
          onSubmit: () => undefined,
          fluencyReminders: [
            { id: 'note-1', kind: 'importantError', text: 'Je suis arrivé il y a trois ans.' },
          ],
          usedReminderIds: [],
          onToggleReminder,
        } as any)}
      />,
    )

    fireEvent.click(
      screen.getByRole('button', { name: /je l'ai réellement utilisée/i }),
    )
    expect(onToggleReminder).toHaveBeenCalledWith('note-1')
  })
})
