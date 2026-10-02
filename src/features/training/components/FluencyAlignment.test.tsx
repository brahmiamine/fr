import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Question, Topic } from '../../../types/content'
import { Fluency432Exercise } from './Fluency432Exercise'
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

const pivot: Question = {
  id: 'q-b',
  text: "Maintenant : l'intelligence artificielle à l'école.",
  category: 'technologie',
  difficulty: 'hard',
}

afterEach(() => {
  vi.useRealTimers()
})

describe('4→3→2 alignment', () => {
  it('hides preparation prompts until the learner explicitly asks for a hint', () => {
    render(
      <Fluency432Exercise
        topic={topic}
        roundIndex={0}
        stage="prep"
        feedback={{
          missingWord: '',
          missingWordContext: '',
          difficultPhrase: '',
          importantError: '',
        }}
        keywords={[]}
        chunksOfDay={[]}
        focusWords={[]}
        fluencyReminders={[]}
        onKeywordsChange={() => undefined}
        onStartRound={() => undefined}
        onRoundComplete={() => undefined}
        onSubmitFeedback={() => undefined}
      />,
    )

    expect(screen.queryByText('Quel est ton choix personnel ?')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /besoin d'une piste/i }))
    expect(screen.getByText('Quel est ton choix personnel ?')).toBeInTheDocument()
  })

  it('asks for a corrected formulation rather than storing the raw error', () => {
    render(
      <Fluency432Exercise
        topic={topic}
        roundIndex={0}
        stage="feedback"
        feedback={{
          missingWord: '',
          missingWordContext: '',
          difficultPhrase: '',
          importantError: '',
        }}
        keywords={[]}
        chunksOfDay={[]}
        focusWords={[]}
        fluencyReminders={[]}
        onKeywordsChange={() => undefined}
        onStartRound={() => undefined}
        onRoundComplete={() => undefined}
        onSubmitFeedback={() => undefined}
      />,
    )

    expect(
      screen.getByLabelText(/formulation corrigée à réutiliser/i),
    ).toBeInTheDocument()
  })
})

describe('advanced surprise-question pivot', () => {
  it('gives 60 seconds to the first question, then an additional 30-second pivot', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-02T10:00:00.000Z'))
    const onSpeakingDone = vi.fn()

    render(
      <SurpriseQuestionsExercise
        question={question}
        index={4}
        total={5}
        stage="speaking"
        prepSeconds={3}
        chunksOfDay={[]}
        focusWords={[]}
        pivotQuestion={pivot}
        onCountdownDone={() => undefined}
        onPrepDone={() => undefined}
        onSpeakingDone={onSpeakingDone}
        onRate={() => undefined}
        onDone={() => undefined}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Démarrer' }))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(screen.getByText(pivot.text)).toBeInTheDocument()
    expect(onSpeakingDone).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(onSpeakingDone).toHaveBeenCalledTimes(1)
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
})
