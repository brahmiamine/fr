import { AudioClip } from '../../../components/AudioClip/AudioClip'
import type { FormEvent } from 'react'
import type { Chunk } from '../../../types/content'
import { SpeakButton } from '../../../components/Speech/SpeakButton'
import type { FluencyReminder, SessionFeedback } from '../types'
import { isFeedbackValid } from '../sessionReducer'

export interface SessionFeedbackProps {
  feedback: SessionFeedback
  onChange: (field: keyof SessionFeedback, value: string | number | null) => void
  onSubmit: () => void
  audioUrl?: string | null
  fluencyReminders?: FluencyReminder[]
  usedReminderIds?: string[]
  onToggleReminder?: (reminderId: string) => void
  chunksOfDay?: Chunk[]
  usedChunkIds?: string[]
  onToggleChunk?: (chunkId: string) => void
}

export function SessionFeedbackView({
  feedback,
  onChange,
  onSubmit,
  audioUrl = null,
  fluencyReminders = [],
  usedReminderIds = [],
  onToggleReminder,
  chunksOfDay = [],
  usedChunkIds = [],
  onToggleChunk,
}: SessionFeedbackProps) {
  const valid = isFeedbackValid(feedback)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    onSubmit()
  }

  return (
    <section className="card card--slide" aria-labelledby="feedback-title">
      <h1 id="feedback-title">Feedback de fin de séance</h1>
      <p className="muted">
        Garde seulement les difficultés utiles, mais note la formulation
        corrigée que tu veux réutiliser — pas l'erreur brute.
      </p>

      {audioUrl ? (
        <div className="callout">
          <h2>Réécoute finale</h2>
          <p className="muted">
            Réécoute environ une minute avant de remplir ce feedback.
          </p>
          <AudioClip src={audioUrl} label="Écouter mon enregistrement" />
        </div>
      ) : null}

      {chunksOfDay.length > 0 && onToggleChunk ? (
        <div className="callout">
          <h2>Chunks du jour placés en parlant</h2>
          <p className="muted">
            Coche seulement ceux que tu as vraiment utilisés pendant le 4 → 3 → 2
            ou les questions.
          </p>
          <ul>
            {chunksOfDay.map((chunk) => {
              const used = usedChunkIds.includes(chunk.id)
              return (
                <li key={chunk.id} className="feedback-reminder">
                  <p className="feedback-reminder__text">« {chunk.expression} »</p>
                  <div className="feedback-reminder__actions">
                    <button
                      type="button"
                      className={`chip${used ? ' is-active' : ''}`}
                      aria-pressed={used}
                      aria-label={`J'ai placé « ${chunk.expression} »`}
                      onClick={() => onToggleChunk(chunk.id)}
                    >
                      {used ? 'Placé ✓' : "Je l'ai placé"}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {fluencyReminders.length > 0 ? (
        <div className="callout">
          <h2>Corrections travaillées aujourd'hui</h2>
          <p className="muted">
            Confirme seulement celles que tu as réellement produites à voix haute.
          </p>
          <ul>
            {fluencyReminders.map((reminder) => {
              const used = usedReminderIds.includes(reminder.id)
              return (
                <li key={reminder.id} className="feedback-reminder">
                  <p className="feedback-reminder__text">{reminder.text}</p>
                  <div className="feedback-reminder__actions">
                    <SpeakButton
                      text={reminder.text}
                      label="Écouter"
                      ariaLabel={`Écouter la correction ${reminder.text}`}
                      compact
                    />
                    <button
                      type="button"
                      className={`chip${used ? ' is-active' : ''}`}
                      aria-pressed={used}
                      onClick={() => onToggleReminder?.(reminder.id)}
                    >
                      {used ? 'Utilisée ✓' : "Je l'ai réellement utilisée"}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <form className="form-stack" onSubmit={handleSubmit}>
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

        {feedback.blockedWord.trim() ? (
          <div className="field">
            <label htmlFor="blocked-word-context">
              Quelle idée voulais-tu exprimer avec ce mot ?
            </label>
            <input
              id="blocked-word-context"
              value={feedback.blockedWordContext}
              onChange={(event) => onChange('blockedWordContext', event.target.value)}
              required
              autoComplete="off"
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="abandoned-sentence">
            Reformulation corrigée de la phrase abandonnée (facultatif)
          </label>
          <input
            id="abandoned-sentence"
            value={feedback.abandonedSentence}
            onChange={(event) => onChange('abandonedSentence', event.target.value)}
            autoComplete="off"
          />
          {feedback.abandonedSentence.trim() ? (
            <SpeakButton
              text={feedback.abandonedSentence}
              label="Écouter"
              ariaLabel="Écouter la phrase corrigée"
              compact
            />
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="awkward-phrase">
            Formulation corrigée à réutiliser (facultatif)
          </label>
          <input
            id="awkward-phrase"
            value={feedback.awkwardPhrase}
            onChange={(event) => onChange('awkwardPhrase', event.target.value)}
            autoComplete="off"
          />
          {feedback.awkwardPhrase.trim() ? (
            <SpeakButton
              text={feedback.awkwardPhrase}
              label="Écouter"
              ariaLabel="Écouter la formulation corrigée"
              compact
            />
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="expression-reuse">
            Quelle expression utile veux-tu transformer en chunk personnel ?
          </label>
          <input
            id="expression-reuse"
            value={feedback.expressionToReuse}
            onChange={(event) => onChange('expressionToReuse', event.target.value)}
            autoComplete="off"
          />
          {feedback.expressionToReuse.trim() ? (
            <SpeakButton
              text={feedback.expressionToReuse}
              label="Écouter"
              ariaLabel="Écouter l'expression à réutiliser"
              compact
            />
          ) : null}
        </div>

        {feedback.expressionToReuse.trim() ? (
          <div className="field">
            <label htmlFor="expression-intent">
              À quoi sert cette expression ? (ex. nuancer une opinion)
            </label>
            <input
              id="expression-intent"
              value={feedback.expressionIntent}
              onChange={(event) => onChange('expressionIntent', event.target.value)}
              required
              autoComplete="off"
            />
          </div>
        ) : null}

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

        <button type="submit" className="button button--gradient button--lg button--block" disabled={!valid}>
          Terminer la séance
        </button>
        {!valid ? (
          <p className="muted exercise__hint">
            Indique le nombre de blocages, ta note et le contexte des éléments
            que tu veux mémoriser.
          </p>
        ) : null}
      </form>
    </section>
  )
}
