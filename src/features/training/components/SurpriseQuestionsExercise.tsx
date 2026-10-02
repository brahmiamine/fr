import { useState } from 'react'
import type { Chunk, Question } from '../../../types/content'
import { Timer } from '../../../components/Timer/Timer'
import {
  QUESTION_COUNTDOWN_SECONDS,
  QUESTION_SPEAKING_SECONDS,
  QUESTION_STARTERS,
  QUESTION_TYPE_LABELS,
} from '../types'
import type { BlockRating } from '../types'

export interface SurpriseQuestionsExerciseProps {
  question: Question
  index: number
  total: number
  stage: 'countdown' | 'prep' | 'speaking' | 'rate'
  prepSeconds: number
  /** 60 s at first, up to 90 s as the learner progresses. */
  speakingSeconds?: number
  chunksOfDay: Chunk[]
  focusWords: string[]
  pivotQuestion?: Question | null
  revenge?: boolean
  onCountdownDone: () => void
  onPrepDone: () => void
  onSpeakingDone: () => void
  onRate: (rating: BlockRating) => void
  onDone: () => void
}

const PIVOT_SECONDS = 30

export function SurpriseQuestionsExercise({
  question,
  index,
  total,
  stage,
  prepSeconds,
  speakingSeconds: answerSeconds = QUESTION_SPEAKING_SECONDS,
  chunksOfDay,
  focusWords,
  pivotQuestion = null,
  revenge = false,
  onCountdownDone,
  onPrepDone,
  onSpeakingDone,
  onRate,
  onDone,
}: SurpriseQuestionsExerciseProps) {
  const [showStarters, setShowStarters] = useState(false)
  const [pivotActive, setPivotActive] = useState(false)

  const counterLabel = revenge ? 'Revanche' : `Question ${index + 1}/${total}`

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
          hideControls
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
        <h1 className="exercise__prompt">{question.text}</h1>
        {question.type ? (
          <p className="pill">
            Type : {QUESTION_TYPE_LABELS[question.type] ?? question.type}
          </p>
        ) : null}
        <p className="exercise__prep-plan">Idée → raison → exemple</p>
        <Timer
          durationSeconds={prepSeconds}
          autoStart
          hideControls
          compact
          secondsOnly
          label="Préparation"
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

  const hasAdvancedPivot = Boolean(pivotQuestion && !revenge)
  const activeQuestion = pivotActive && pivotQuestion ? pivotQuestion : question
  // With an advanced pivot: 60 s, then the abrupt 30 s pivot.
  const speakingSeconds = pivotActive
    ? PIVOT_SECONDS
    : hasAdvancedPivot
      ? QUESTION_SPEAKING_SECONDS
      : answerSeconds

  const completeSpeakingPhase = () => {
    if (hasAdvancedPivot && !pivotActive) {
      setPivotActive(true)
      return
    }
    if (revenge) onDone()
    else onSpeakingDone()
  }

  return (
    <section className="card exercise" aria-labelledby="question-title">
      <p className="pill">
        {pivotActive ? 'Pivot — change de sujet maintenant' : counterLabel}
      </p>
      <h2 id="question-title" className="exercise__prompt">
        {activeQuestion.text}
      </h2>

      <Timer
        key={pivotActive ? 'pivot' : 'main'}
        durationSeconds={speakingSeconds}
        autoStart
        hideControls
        label={pivotActive ? 'Continue immédiatement' : 'Parle'}
        onComplete={completeSpeakingPhase}
      />

      {chunksOfDay.length > 0 ? (
        <p className="exercise__chunks">
          <span className="muted">Essaie de placer :</span>{' '}
          {chunksOfDay.map((chunk) => chunk.expression).join(' · ')}
        </p>
      ) : null}

      {focusWords.length > 0 ? (
        <p className="exercise__chunks">
          <span className="muted">Mots à réutiliser :</span>{' '}
          {focusWords.join(' · ')}
        </p>
      ) : null}

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
    </section>
  )
}
