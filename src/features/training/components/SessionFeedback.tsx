import type { FormEvent } from 'react'
import type { SessionFeedback } from '../types'
import { isFeedbackValid } from '../sessionReducer'

export interface SessionFeedbackProps {
  feedback: SessionFeedback
  onChange: (field: keyof SessionFeedback, value: string | number | null) => void
  onSubmit: () => void
}

export function SessionFeedbackView({
  feedback,
  onChange,
  onSubmit,
}: SessionFeedbackProps) {
  const valid = isFeedbackValid(feedback)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    onSubmit()
  }

  return (
    <section className="card exercise" aria-labelledby="feedback-title">
      <h1 id="feedback-title">Feedback de fin de séance</h1>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="blocked-word">
            Quel mot t'a le plus bloqué aujourd'hui ? (facultatif)
          </label>
          <input
            id="blocked-word"
            value={feedback.blockedWord}
            onChange={(event) => onChange('blockedWord', event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="expression-reuse">
            Quelle expression veux-tu réutiliser demain ? (facultatif)
          </label>
          <input
            id="expression-reuse"
            value={feedback.expressionToReuse}
            onChange={(event) => onChange('expressionToReuse', event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="block-count">Combien de vrais blocages ?</label>
          <input
            id="block-count"
            type="number"
            min={0}
            inputMode="numeric"
            value={feedback.blockCount ?? ''}
            onChange={(event) =>
              onChange(
                'blockCount',
                event.target.value === '' ? null : Number(event.target.value),
              )
            }
          />
        </div>

        <fieldset className="field fluency-score">
          <legend>Fluidité ressentie aujourd'hui</legend>
          <div className="fluency-score__options">
            {[1, 2, 3, 4, 5].map((score) => (
              <button
                key={score}
                type="button"
                className={`fluency-score__option ${
                  feedback.fluencyScore === score ? 'is-active' : ''
                }`}
                aria-pressed={feedback.fluencyScore === score}
                onClick={() => onChange('fluencyScore', score)}
              >
                {score}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="submit"
          className="button button--block"
          disabled={!valid}
        >
          Terminer la séance
        </button>
        {!valid ? (
          <p className="muted exercise__hint">
            Indique le nombre de blocages et ta note de fluidité.
          </p>
        ) : null}
      </form>
    </section>
  )
}
