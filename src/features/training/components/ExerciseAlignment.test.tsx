import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Chunk, Question, Topic } from '../../../types/content'
import type { GapItem } from '../types'
import { ChunksExercise } from './ChunksExercise'
import { Fluency432Exercise } from './Fluency432Exercise'
import { SessionFeedbackView } from './SessionFeedback'
import { SurpriseQuestionsExercise } from './SurpriseQuestionsExercise'
import { WordGapsExercise } from './WordGapsExercise'

afterEach(() => {
  vi.useRealTimers()
})

const chunk: Chunk = {
  id: 'chunk_001',
  intent: 'Nuancer une opinion',
  expression: "D'un autre côté…",
  category: 'opinion',
  level: 'B2',
}

const topic: Topic = {
  id: 't-test',
  title: 'Télétravail ou bureau ?',
  category: 'travail',
  difficulty: 'medium',
  prompts: ['Quel est ton choix ?'],
  transferPrompt: 'La semaine de quatre jours est-elle une bonne idée ?',
}

const emptyFeedback = {
  missingWord: '',
  missingWordContext: '',
  difficultPhrase: '',
  importantError: '',
}

function fluencyProps(overrides: Partial<Parameters<typeof Fluency432Exercise>[0]> = {}) {
  return {
    topic,
    roundIndex: 0,
    stage: 'prep' as const,
    feedback: emptyFeedback,
    keywords: [],
    chunksOfDay: [],
    focusWords: [],
    fluencyReminders: [],
    recordAll: true,
    recordings: {},
    onKeywordsChange: () => undefined,
    onRecordAllChange: () => undefined,
    onStartRound: () => undefined,
    onRoundComplete: () => undefined,
    onSummaryDone: () => undefined,
    onSubmitFeedback: () => undefined,
    ...overrides,
  }
}

describe('chunks: discovery of a never-seen chunk', () => {
  it('asks for a proposal then lets the learner mark the chunk as discovered', () => {
    const onRate = vi.fn()
    const { rerender } = render(
      <ChunksExercise
        chunk={chunk}
        index={0}
        total={4}
        step="retrieve"
        chunksOfDay={[chunk]}
        isNew
        onReveal={() => undefined}
        onRate={onRate}
        onContinue={() => undefined}
      />,
    )
    expect(screen.getByText(/Chunk 1\/4 · Nouveau/)).toBeInTheDocument()

    rerender(
      <ChunksExercise
        chunk={chunk}
        index={0}
        total={4}
        step="revealed"
        chunksOfDay={[chunk]}
        isNew
        onReveal={() => undefined}
        onRate={onRate}
        onContinue={() => undefined}
      />,
    )
    expect(screen.queryByRole('button', { name: "Je ne l'ai pas retrouvé" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Nouvelle pour moi/ }))
    expect(onRate).toHaveBeenCalledWith('discovered')
  })
})

describe('4→3→2: feedback between rounds', () => {
  it('counts four passes and asks for a chunk that could have been used', () => {
    render(<Fluency432Exercise {...fluencyProps()} />)
    expect(screen.getByText('Tour 1 / 4')).toBeInTheDocument()
  })

  it('requires the purpose of the missed chunk and sends it with the feedback', () => {
    const onSubmitFeedback = vi.fn()
    render(
      <Fluency432Exercise
        {...fluencyProps({ stage: 'feedback', onSubmitFeedback })}
      />,
    )
    fireEvent.change(screen.getByLabelText(/chunk que tu aurais pu utiliser/), {
      target: { value: "D'un autre côté" },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continuer vers le tour 2' }))
    expect(onSubmitFeedback).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('À quoi sert-il ?'), {
      target: { value: 'nuancer' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Continuer vers le tour 2' }))
    expect(onSubmitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ missedChunk: "D'un autre côté", missedChunkIntent: 'nuancer' }),
    )
  })

  it('reminds the missed chunk during rounds 2 and 3', () => {
    render(
      <Fluency432Exercise
        {...fluencyProps({
          stage: 'running',
          roundIndex: 1,
          feedback: { ...emptyFeedback, missedChunk: "D'un autre côté", missedChunkIntent: 'nuancer' },
        })}
      />,
    )
    expect(screen.getByText(/À réutiliser dans ce tour/)).toBeInTheDocument()
    expect(screen.getByText("D'un autre côté")).toBeInTheDocument()
  })

  it('makes the correction of round 1 the target of rounds 2 and 3 only', () => {
    const feedback = { ...emptyFeedback, importantError: 'je suis allé', difficultPhrase: 'au bout du compte' }
    const { rerender } = render(
      <Fluency432Exercise {...fluencyProps({ stage: 'running', roundIndex: 2, feedback })} />,
    )
    expect(screen.getByText('je suis allé')).toBeInTheDocument()
    expect(screen.getByText('au bout du compte')).toBeInTheDocument()

    rerender(
      <Fluency432Exercise {...fluencyProps({ stage: 'running', roundIndex: 0, feedback })} />,
    )
    expect(screen.queryByText('je suis allé')).not.toBeInTheDocument()
  })

  it('offers the story to listen to on retelling days, with the text hidden', () => {
    render(
      <Fluency432Exercise
        {...fluencyProps({
          retellingStory: {
            id: 'story_test',
            title: 'Le train manqué',
            category: 'mobilite',
            text: 'Julie devait prendre le train de huit heures.',
            transferPrompt: 'Raconte un imprévu.',
          },
        })}
      />,
    )
    expect(screen.getByText(/Écoute-la sans lire/)).toBeInTheDocument()
    expect(screen.queryByText(/Julie devait/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Lire le texte/ }))
    expect(screen.getByText(/Julie devait/)).toBeInTheDocument()
    expect(screen.getByLabelText(/expressions entendues/)).toBeInTheDocument()
  })
})

describe('surprise questions: longer answers as the learner progresses', () => {
  const question: Question = {
    id: 'q-a',
    text: 'Le télétravail est-il positif ?',
    category: 'travail',
    difficulty: 'medium',
    type: 'opinion',
  }

  it('uses the speaking time given by the level', () => {
    vi.useFakeTimers()
    const onSpeakingDone = vi.fn()
    render(
      <SurpriseQuestionsExercise
        question={question}
        index={0}
        total={5}
        stage="speaking"
        prepSeconds={3}
        speakingSeconds={90}
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
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(onSpeakingDone).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(onSpeakingDone).toHaveBeenCalledTimes(1)
  })

  it('shows the question type in French', () => {
    render(
      <SurpriseQuestionsExercise
        question={{ ...question, type: 'problem-solving' }}
        index={0}
        total={5}
        stage="prep"
        prepSeconds={10}
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
    expect(screen.getByText('Type : résolution de problème')).toBeInTheDocument()
  })
})

describe('word gaps: quick recall, then honest check', () => {
  const personal: GapItem = {
    key: 'gap-1',
    kind: 'retrieve',
    target: 'prise électrique',
    context: 'l’endroit dans le mur où on branche un appareil',
    isPersonal: true,
    sourceId: 'gap-1',
  }

  function gapProps(overrides: Partial<Parameters<typeof WordGapsExercise>[0]> = {}) {
    return {
      item: personal,
      index: 0,
      total: 5,
      step: 'recall' as const,
      onFound: () => undefined,
      onVerify: () => undefined,
      onStartParaphrase: () => undefined,
      onReveal: () => undefined,
      onNext: () => undefined,
      ...overrides,
    }
  }

  it('switches to circumlocution when the word does not come quickly', () => {
    vi.useFakeTimers()
    const onStartParaphrase = vi.fn()
    render(<WordGapsExercise {...gapProps({ onStartParaphrase })} />)
    expect(screen.queryByText('prise électrique')).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(5_000)
    })
    expect(onStartParaphrase).toHaveBeenCalledTimes(1)
  })

  it('asks whether the answer was right after showing it', () => {
    const onVerify = vi.fn()
    render(<WordGapsExercise {...gapProps({ step: 'verify', onVerify })} />)
    expect(screen.getByText('prise électrique')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Non, c'était faux/ }))
    expect(onVerify).toHaveBeenCalledWith(false)
  })

  it('lets a generic word join the personal gap list with its idea', () => {
    const onCapture = vi.fn()
    render(
      <WordGapsExercise
        {...gapProps({
          step: 'revealed',
          item: { ...personal, key: 'word-w001', kind: 'paraphrase', isPersonal: false, context: '' },
          onCapture,
        })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter à mes trous de mots' }))
    fireEvent.change(screen.getByLabelText(/L'idée, en une phrase/), {
      target: { value: 'là où on branche un appareil' },
    })
    expect(onCapture).toHaveBeenLastCalledWith('là où on branche un appareil')
  })
})

describe('final feedback: chunks really placed', () => {
  it('lets the learner confirm the chunks of the day used while speaking', () => {
    const onToggleChunk = vi.fn()
    render(
      <SessionFeedbackView
        feedback={{
          blockedWord: '',
          blockedWordContext: '',
          abandonedSentence: '',
          awkwardPhrase: '',
          expressionToReuse: '',
          expressionIntent: '',
          blockCount: null,
          fluencyScore: null,
        }}
        onChange={() => undefined}
        onSubmit={() => undefined}
        chunksOfDay={[chunk]}
        usedChunkIds={[]}
        onToggleChunk={onToggleChunk}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: "J'ai placé « D'un autre côté… »" }))
    expect(onToggleChunk).toHaveBeenCalledWith('chunk_001')
  })
})
