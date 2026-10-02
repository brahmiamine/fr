import type { ParaphraseWord } from '../../../types/content'
import { Timer } from '../../../components/Timer/Timer'
import { PARAPHRASE_RESCUE_STRUCTURES, PARAPHRASE_SECONDS } from '../types'

export interface ParaphraseExerciseProps {
  word: ParaphraseWord
  index: number
  total: number
  onNext: () => void
  onFinishEarly: () => void
}

export function ParaphraseExercise({
  word,
  index,
  total,
  onNext,
  onFinishEarly,
}: ParaphraseExerciseProps) {
  const isLast = index + 1 >= total

  return (
    <section className="card exercise" aria-labelledby="paraphrase-title">
      <p className="pill">
        Mot {index + 1}/{total}
      </p>
      <h2 id="paraphrase-title" className="exercise__prompt">
        Fais deviner : <strong>{word.word}</strong>
      </h2>
      <p className="muted">
        Interdiction de dire le mot. Explique, décris, donne des exemples.
      </p>

      <div className="exercise__rescue">
        <h3>Structures de secours</h3>
        <ul>
          {PARAPHRASE_RESCUE_STRUCTURES.map((structure) => (
            <li key={structure}>{structure}</li>
          ))}
        </ul>
      </div>

      <Timer
        durationSeconds={PARAPHRASE_SECONDS}
        label="Explique sans dire le mot"
      />

      <div className="row exercise__actions">
        <button type="button" className="button" onClick={onNext}>
          {isLast ? "Terminer l'exercice" : 'Mot suivant'}
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
