import { useState } from 'react'
import type { Question } from '../../../types/content'
import { Timer } from '../../../components/Timer/Timer'
import {
  QUESTION_COUNTDOWN_SECONDS,
  QUESTION_SPEAKING_SECONDS,
  QUESTION_STARTERS,
} from '../types'
import type { BlockRating } from '../types'

export interface SurpriseQuestionsExerciseProps {
  question: Question
  index: number
  total: number
  stage: 'countdown' | 'prep' | 'speaking' | 'rate'
  prepSeconds: number
  revenge?: boolean
  onCountdownDone: () => void
  onPrepDone: () => void
  onSpeakingDone: () => void
  onRate: (rating: BlockRating) => void
  onDone: () => void
}

export function SurpriseQuestionsExercise({
  question,
  index,
  total,
  stage,
  prepSeconds,
  revenge = false,
  onCountdownDone,
  onPrepDone,
  onSpeakingDone,
  onRate,
  onDone,
}: SurpriseQuestionsExerciseProps) {
  const [showStarters, setShowStarters] = useState(false)

  const counterLabel = revenge
    ? 'Revanche'
    : `Question ${index + 1}/${total}`

  if (stage === 'countdown') {
    return (
      <section className="card exercise exercise--center" aria-live="polite">
        <p className="pill">{counterLabel}</p>
        <h2>{revenge ? 'Revanche :' : 'Question suivante dans…'}</h2>
        {revenge ? (
          <p className="muted">
            Tu as eu du mal sur celle-ci. Refais-la une deuxième fois.
          </p>
        ) : null}
        <Timer
          durationSeconds={QUESTION_COUNTDOWN_SECONDS}
          autoStart
          compact
          secondsOnly
          onComplete={onCountdownDone}
        />
      </section>
    )
  }

  if (stage === 'prep') {
    return (
      <section className="card exercise exercise--center" aria-live="polite">
        <p className="pill">{counterLabel}</p>
        <h2>Prépare-toi</h2>
        <p className="exercise__prep-plan">Opinion → raison → exemple</p>
        <Timer
          durationSeconds={prepSeconds}
          autoStart
          compact
          secondsOnly
          onComplete={onPrepDone}
        />
      </section>
    )
  }

  if (stage === 'rate') {
    return (
      <section className="card exercise exercise--center">
        <h2>As-tu bloqué ?</h2>
        <div className="stack exercise__ratings">
          <button type="button" className="button" onClick={() => onRate('none')}>
            Non
          </button>
          <button
            type="button"
            className="button button--subtle"
            onClick={() => onRate('some')}
          >
            Un peu
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onRate('much')}
          >
            Beaucoup
          </button>
        </div>
      </section>
    )
  }

  // speaking
  return (
    <section className="card exercise" aria-labelledby="question-title">
      <p className="pill">{counterLabel}</p>
      <h2 id="question-title" className="exercise__prompt">
        {question.text}
      </h2>

      <Timer
        durationSeconds={QUESTION_SPEAKING_SECONDS}
        label="Parle"
        onComplete={revenge ? onDone : onSpeakingDone}
      />

      {!showStarters ? (
        <button
          type="button"
          className="button button--ghost button--block"
          onClick={() => setShowStarters(true)}
        >
          Besoin d'une amorce ?
        </button>
      ) : (
        <div className="exercise__rescue">
          <h3>Amorces possibles</h3>
          <ul>
            {QUESTION_STARTERS.map((starter) => (
              <li key={starter}>{starter}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="button button--subtle button--block"
        onClick={revenge ? onDone : onSpeakingDone}
      >
        {revenge ? 'Terminer' : "J'ai terminé"}
      </button>
    </section>
  )
}
