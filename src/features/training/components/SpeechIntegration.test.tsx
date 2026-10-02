import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChunksExercise } from './ChunksExercise'
import { Fluency432Exercise } from './Fluency432Exercise'
import { SessionFeedbackView } from './SessionFeedback'
import { SurpriseQuestionsExercise } from './SurpriseQuestionsExercise'
import { WordGapsExercise } from './WordGapsExercise'
import type { Chunk, Question, Topic } from '../../../types/content'

const chunk: Chunk = {
  id: 'chunk-1',
  intent: 'Nuancer une opinion',
  expression: "D'un autre côté…",
  category: 'opinion',
  level: 'B2',
  register: 'courant',
  usageTip: 'À utiliser pour introduire un contraste.',
}

const topic: Topic = {
  id: 'topic-1',
  title: 'Télétravail ou bureau ?',
  category: 'travail',
  difficulty: 'medium',
  prompts: ['Quel impact sur le temps de trajet ?'],
  transferPrompt: 'La semaine de quatre jours est-elle une bonne idée ?',
}

const question: Question = {
  id: 'question-1',
  text: 'Les réseaux sociaux améliorent-ils les relations humaines ?',
  category: 'societe',
  difficulty: 'medium',
  type: 'opinion',
}

beforeEach(() => {
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
    },
  })

  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class SpeechSynthesisUtteranceMock {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      volume = 1
      voice: SpeechSynthesisVoice | null = null
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null

      constructor(text: string) {
        this.text = text
      }
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('guided text-to-speech placement', () => {
  it('offers pronunciation only after a chunk has been revealed', () => {
    const commonProps = {
      chunk,
      index: 0,
      total: 1,
      chunksOfDay: [chunk],
      onReveal: vi.fn(),
      onRate: vi.fn(),
      onContinue: vi.fn(),
    }

    const { rerender } = render(
      <ChunksExercise {...commonProps} step="retrieve" />,
    )
    expect(
      screen.queryByRole('button', { name: /écouter l'expression/i }),
    ).not.toBeInTheDocument()

    rerender(<ChunksExercise {...commonProps} step="revealed" />)
    expect(
      screen.getByRole('button', { name: /écouter l'expression/i }),
    ).toBeInTheDocument()
  })

  it('speaks revealed French with the shared speech settings', async () => {
    const user = userEvent.setup()
    render(
      <ChunksExercise
        chunk={chunk}
        index={0}
        total={1}
        step="revealed"
        chunksOfDay={[chunk]}
        onReveal={vi.fn()}
        onRate={vi.fn()}
        onContinue={vi.fn()}
      />,
    )

    await user.click(
      screen.getByRole('button', { name: /écouter l'expression/i }),
    )

    expect(window.speechSynthesis.cancel).toHaveBeenCalledTimes(1)
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(1)
    const utterance = vi.mocked(window.speechSynthesis.speak).mock.calls[0][0]
    expect(utterance.text).toBe(chunk.expression)
    expect(utterance.lang).toBe('fr-FR')
    expect(utterance.rate).toBe(0.95)
  })

  it('lets the learner hear each chunk again in the chunks-of-day recap', () => {
    render(
      <ChunksExercise
        chunk={chunk}
        index={0}
        total={1}
        step="day"
        chunksOfDay={[chunk]}
        onReveal={vi.fn()}
        onRate={vi.fn()}
        onContinue={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: /écouter d'un autre côté/i }),
    ).toBeInTheDocument()
  })

  it('offers pronunciation only after a missing word is revealed', () => {
    const item = {
      key: 'gap-1',
      kind: 'retrieve' as const,
      target: 'prise électrique',
      context: "l'endroit dans le mur où je branche un appareil",
      isPersonal: true,
      sourceId: 'word-1',
      rescueAngles: ['À quoi ça sert ?'],
    }
    const commonProps = {
      item,
      index: 0,
      total: 1,
      onFound: vi.fn(),
      onStartParaphrase: vi.fn(),
      onReveal: vi.fn(),
      onNext: vi.fn(),
    }

    const { rerender } = render(
      <WordGapsExercise {...commonProps} step="recall" />,
    )
    expect(
      screen.queryByRole('button', { name: /écouter le mot/i }),
    ).not.toBeInTheDocument()

    rerender(<WordGapsExercise {...commonProps} step="revealed" />)
    expect(
      screen.getByRole('button', { name: /écouter le mot/i }),
    ).toBeInTheDocument()
  })

  it('adds listening aids before 4→3→2 without adding them while the learner is speaking', () => {
    const reminder = {
      id: 'note-1',
      kind: 'importantError' as const,
      text: 'Je suis arrivé il y a trois ans.',
    }
    const commonProps = {
      topic,
      roundIndex: 0,
      feedback: {
        missingWord: '',
        missingWordContext: '',
        difficultPhrase: '',
        importantError: '',
      },
      keywords: [],
      chunksOfDay: [chunk],
      focusWords: ['embouteillage'],
      fluencyReminders: [reminder],
      onKeywordsChange: vi.fn(),
      onStartRound: vi.fn(),
      onRoundComplete: vi.fn(),
      onSubmitFeedback: vi.fn(),
    }

    const { rerender } = render(
      <Fluency432Exercise {...commonProps} stage="prep" />,
    )

    expect(
      screen.getByRole('button', { name: /écouter le sujet/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /écouter la correction/i }),
    ).toBeInTheDocument()

    rerender(<Fluency432Exercise {...commonProps} stage="running" />)
    expect(
      screen.queryByRole('button', { name: /écouter/i }),
    ).not.toBeInTheDocument()
  })

  it('lets the 4→3→2 mini-feedback corrections be heard before the next round', () => {
    render(
      <Fluency432Exercise
        topic={topic}
        roundIndex={0}
        stage="feedback"
        feedback={{
          missingWord: '',
          missingWordContext: '',
          difficultPhrase: 'Je travaille ici depuis trois ans.',
          importantError: 'Je suis arrivé il y a trois ans.',
        }}
        keywords={[]}
        chunksOfDay={[chunk]}
        focusWords={[]}
        fluencyReminders={[]}
        onKeywordsChange={vi.fn()}
        onStartRound={vi.fn()}
        onRoundComplete={vi.fn()}
        onSubmitFeedback={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: /écouter la phrase reformulée/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /écouter la correction à réutiliser/i }),
    ).toBeInTheDocument()
  })

  it('lets corrected feedback be heard before it is saved for reuse', () => {
    render(
      <SessionFeedbackView
        feedback={{
          blockedWord: '',
          blockedWordContext: '',
          abandonedSentence: 'Je suis allé au bureau hier.',
          awkwardPhrase: "Ce que je veux dire, c'est que ça dépend.",
          expressionToReuse: "D'un autre côté…",
          expressionIntent: 'Nuancer',
          blockCount: 2,
          fluencyScore: 3,
        }}
        fluencyReminders={[
          {
            id: 'note-1',
            kind: 'importantError',
            text: 'Je suis arrivé il y a trois ans.',
          },
        ]}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: /écouter la correction je suis arrivé/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /écouter la phrase corrigée/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /écouter la formulation corrigée/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /écouter l'expression à réutiliser/i }),
    ).toBeInTheDocument()
  })

  it('does not add text-to-speech to surprise questions because their preparation is timed', () => {
    render(
      <SurpriseQuestionsExercise
        question={question}
        index={0}
        total={1}
        stage="prep"
        prepSeconds={3}
        chunksOfDay={[chunk]}
        focusWords={[]}
        onCountdownDone={vi.fn()}
        onPrepDone={vi.fn()}
        onSpeakingDone={vi.fn()}
        onRate={vi.fn()}
        onDone={vi.fn()}
      />,
    )

    expect(
      screen.queryByRole('button', { name: /écouter/i }),
    ).not.toBeInTheDocument()
  })
})
