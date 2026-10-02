import type { FormEvent } from 'react'
import type { ReviewDraft } from '../types'
import { isReviewValid } from '../sessionReducer'

export interface SessionReviewProps {
  review: ReviewDraft
  expressionOptions: string[]
  onChange: (field: keyof ReviewDraft, value: string | number | null) => void
  onSubmit: () => void
}

export function SessionReview({
  review,
  expressionOptions,
  onChange,
  onSubmit,
}: SessionReviewProps) {
  const valid = isReviewValid(review)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    onSubmit()
  }

  return (
    <section className="card exercise" aria-labelledby="review-title">
      <h1 id="review-title">Bilan de la session</h1>
      <p className="muted">Dernière étape : quelques notes rapides.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="block-count">
            Nombre de vrais blocages (0 ou plus)
          </label>
          <input
            id="block-count"
            type="number"
            min={0}
            inputMode="numeric"
            value={review.blockCount ?? ''}
            onChange={(event) =>
              onChange(
                'blockCount',
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          />
        </div>

        <div className="field">
          <label htmlFor="success-paraphrase">
            Un mot bien paraphrasé (facultatif)
          </label>
          <input
            id="success-paraphrase"
            value={review.successParaphrase}
            onChange={(event) =>
              onChange('successParaphrase', event.target.value)
            }
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="expression-reuse">
            Une expression à réutiliser demain (facultatif)
          </label>
          <input
            id="expression-reuse"
            list="expression-options"
            value={review.expressionToReuse}
            onChange={(event) =>
              onChange('expressionToReuse', event.target.value)
            }
            autoComplete="off"
          />
          <datalist id="expression-options">
            {expressionOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="error-watch">
            Une erreur à surveiller (facultatif)
          </label>
          <input
            id="error-watch"
            value={review.errorToWatch}
            onChange={(event) => onChange('errorToWatch', event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="fluency-score">
            Ton ressenti de fluidité (1 à 5)
          </label>
          <select
            id="fluency-score"
            value={review.fluencyScore ?? ''}
            onChange={(event) =>
              onChange(
                'fluencyScore',
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          >
            <option value="">Choisir…</option>
            {[1, 2, 3, 4, 5].map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="button button--block"
          disabled={!valid}
        >
          Terminer la session
        </button>
        {!valid ? (
          <p className="muted exercise__hint">
            Indique le nombre de blocages et une note de 1 à 5.
          </p>
        ) : null}
      </form>
    </section>
  )
}
