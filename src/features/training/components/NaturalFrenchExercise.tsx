import type { NativeExpression } from '../../../types/content'
import { NATURAL_EXAMPLES_PER_EXPRESSION } from '../types'

export interface NaturalFrenchExerciseProps {
  expression: NativeExpression
  index: number
  total: number
  examples: string[]
  onChangeExample: (exampleIndex: number, value: string) => void
  onNext: () => void
}

export function NaturalFrenchExercise({
  expression,
  index,
  total,
  examples,
  onChangeExample,
  onNext,
}: NaturalFrenchExerciseProps) {
  const isLast = index + 1 >= total

  return (
    <section className="card exercise" aria-labelledby="natural-title">
      <p className="pill">
        Expression {index + 1}/{total}
      </p>
      <h2 id="natural-title" className="exercise__prompt">
        {expression.expression}
      </h2>
      <p className="muted">
        Écris 3 phrases personnelles avec cette expression. Essaie d'en réutiliser
        au moins 2 pendant tes autres exercices.
      </p>

      <div className="stack">
        {Array.from({ length: NATURAL_EXAMPLES_PER_EXPRESSION }).map(
          (_, exampleIndex) => (
            <div className="field" key={exampleIndex}>
              <label htmlFor={`example-${expression.id}-${exampleIndex}`}>
                Phrase {exampleIndex + 1}
              </label>
              <input
                id={`example-${expression.id}-${exampleIndex}`}
                value={examples[exampleIndex] ?? ''}
                onChange={(event) =>
                  onChangeExample(exampleIndex, event.target.value)
                }
                placeholder={`${expression.expression} …`}
                autoComplete="off"
              />
            </div>
          ),
        )}
      </div>

      <button type="button" className="button button--block" onClick={onNext}>
        {isLast ? "Terminer l'exercice" : 'Expression suivante'}
      </button>
    </section>
  )
}
