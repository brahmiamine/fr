import type { Question } from '../../../types/content'
import { Timer } from '../../../components/Timer/Timer'
import {
  QUESTION_REVEAL_SECONDS,
  QUESTION_SPEAKING_SECONDS,
  QUESTION_STARTERS,
} from '../types'

export interface SurpriseQuestionsExerciseProps {
  question: Question
  index: number
  total: number
  stage: 'countdown' | 'speaking'
  onCountdownDone: () => void
  onNext: () => void
  onFinishEarly: () => void
}

export function SurpriseQuestionsExercise({
  question,
  index,
  total,
  stage,
  onCountdownDone,
  onNext,
  onFinishEarly,
}: SurpriseQuestionsExerciseProps) {
  if (stage === 'countdown') {
    return (
      <section className="card exercise exercise--center" aria-live="polite">
        <p className="pill">
          Question {index + 1}/{total}
        </p>
        <h2>Prépare-toi…</h2>
        <p className="muted">La question apparaît à la fin du décompte.</p>
        <Timer
          durationSeconds={QUESTION_REVEAL_SECONDS}
          autoStart
          compact
          secondsOnly
          onComplete={onCountdownDone}
        />
      </section>
    )
  }

  const isLast = index + 1 >= total

  return (
    <section className="card exercise" aria-labelledby="question-title">
      <p className="pill">
        Question {index + 1}/{total}
      </p>
      <h2 id="question-title" className="exercise__prompt">
        {question.text}
      </h2>

      <div className="exercise__rescue">
        <h3>Démarreurs possibles</h3>
        <ul>
          {QUESTION_STARTERS.map((starter) => (
            <li key={starter}>{starter}</li>
          ))}
        </ul>
      </div>

      <Timer
        durationSeconds={QUESTION_SPEAKING_SECONDS}
        label="Réponds à voix haute"
      />

      <div className="row exercise__actions">
        <button type="button" className="button" onClick={onNext}>
          {isLast ? "Terminer l'exercice" : 'Question suivante'}
        </button>
        {!isLast ? (
          <button
            type="button"
            className="button button--ghost"
            onClick={onFinishEarly}
          >
            Terminer l'exercice
          </button>
        ) : null}
      </div>
    </section>
  )
}
