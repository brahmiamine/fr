import { Timer } from '../../../components/Timer/Timer'
import type { GapItem } from '../types'
import { GAP_PARAPHRASE_SECONDS, RESCUE_STRUCTURES } from '../types'

export interface WordGapsExerciseProps {
  item: GapItem
  index: number
  total: number
  step: 'recall' | 'paraphrase' | 'revealed'
  onFound: () => void
  onStartParaphrase: () => void
  onReveal: () => void
  onNext: () => void
}

export function WordGapsExercise({
  item,
  index,
  total,
  step,
  onFound,
  onStartParaphrase,
  onReveal,
  onNext,
}: WordGapsExerciseProps) {
  const isLast = index + 1 >= total

  if (step === 'recall') {
    return (
      <section className="card exercise exercise--center" aria-live="polite">
        <p className="pill">
          Mot {index + 1}/{total}
        </p>
        {item.context ? (
          <p className="exercise__context">
            Tu voulais parler de :<br />
            <em>« {item.context} »</em>
          </p>
        ) : null}
        <h1 className="exercise__intent">Retrouve le mot.</h1>

        <div className="stack exercise__ratings">
          <button type="button" className="button" onClick={onFound}>
            Je l'ai trouvé
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={onStartParaphrase}
          >
            Explique-le sans connaître le mot
          </button>
        </div>
      </section>
    )
  }

  if (step === 'paraphrase') {
    return (
      <section className="card exercise" aria-live="polite">
        <p className="pill">
          Mot {index + 1}/{total}
        </p>
        {item.kind === 'retrieve' ? (
          <h1 className="exercise__intent">Explique-le sans le mot.</h1>
        ) : (
          <>
            <h1 className="exercise__intent">
              Explique : <strong>{item.target}</strong>
            </h1>
            <p className="muted">Fais deviner ce mot sans le prononcer.</p>
          </>
        )}

        <div className="exercise__rescue">
          <h3>Structures de secours</h3>
          <ul>
            {RESCUE_STRUCTURES.map((structure) => (
              <li key={structure}>{structure}</li>
            ))}
          </ul>
        </div>

        <Timer durationSeconds={GAP_PARAPHRASE_SECONDS} label="Explique à voix haute" />

        <button type="button" className="button button--block" onClick={onReveal}>
          {item.kind === 'retrieve' ? 'Voir la réponse' : "J'ai expliqué"}
        </button>
      </section>
    )
  }

  // revealed
  return (
    <section className="card exercise exercise--center">
      <p className="pill">
        Mot {index + 1}/{total}
      </p>
      <h1 className="exercise__expression">
        Réponse : <strong>{item.target}</strong>
      </h1>
      <p className="muted">
        Fais maintenant deux phrases avec « {item.target} », à voix haute.
      </p>
      <button type="button" className="button button--block" onClick={onNext}>
        {isLast ? 'Terminer l’exercice' : 'Mot suivant'}
      </button>
    </section>
  )
}
