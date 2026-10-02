import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAppState } from '../../app/AppStateProvider'
import {
  captureWordGap,
  getWeekKey,
  recordConversationPractice,
  toLocalDateString,
  upsertFluencyNote,
  upsertPersonalChunk,
} from '../../services/progress/progress'
import type { ConversationPractice } from '../../types/progress'

export default function WeeklyConversation() {
  const { state, updateWith } = useAppState()
  const weekKey = getWeekKey()
  const existing = state.conversationPractices.find(
    (practice) => practice.weekKey === weekKey,
  )

  const [duration, setDuration] = useState('20')
  const [missingWord, setMissingWord] = useState('')
  const [missingWordContext, setMissingWordContext] = useState('')
  const [blockingMoment, setBlockingMoment] = useState('')
  const [expressionToReuse, setExpressionToReuse] = useState('')
  const [expressionIntent, setExpressionIntent] = useState('')

  if (existing) {
    return (
      <section className="card weekly-test" aria-labelledby="conversation-done">
        <h2 id="conversation-done">Vraie conversation de la semaine ✓</h2>
        <p className="muted">
          {existing.durationMinutes} min d'interaction réelle enregistrées.
          Les difficultés notées sont réinjectées dans l'entraînement.
        </p>
      </section>
    )
  }

  const durationMinutes = Number(duration)
  const valid =
    Number.isFinite(durationMinutes) &&
    durationMinutes >= 20 &&
    (!missingWord.trim() || Boolean(missingWordContext.trim())) &&
    (!expressionToReuse.trim() || Boolean(expressionIntent.trim()))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    const now = new Date()
    const practice: ConversationPractice = {
      id: `conversation-${weekKey}`,
      weekKey,
      date: toLocalDateString(now),
      durationMinutes,
      missingWord: missingWord.trim(),
      missingWordContext: missingWordContext.trim(),
      blockingMoment: blockingMoment.trim(),
      expressionToReuse: expressionToReuse.trim(),
      expressionIntent: expressionIntent.trim(),
    }

    updateWith((prev) => {
      let next = recordConversationPractice(prev, practice)
      next = captureWordGap(next, practice.missingWord, practice.missingWordContext, now)
      next = upsertFluencyNote(next, 'conversationBlock', practice.blockingMoment, now)
      next = upsertPersonalChunk(
        next,
        practice.expressionToReuse,
        practice.expressionIntent,
        now,
      )
      return next
    })
  }

  return (
    <section className="card weekly-test" aria-labelledby="conversation-title">
      <h2 id="conversation-title">Défi de vraie conversation</h2>
      <p className="muted">
        Une fois par semaine, parle 20–30 minutes avec une vraie personne en
        français. Les monologues entraînent le moteur ; cette étape vérifie les
        interruptions, clarifications et réponses immédiates.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="conversation-duration">Durée réelle (minutes)</label>
          <input
            id="conversation-duration"
            type="number"
            min={20}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="conversation-word">Un mot qui t'a manqué ?</label>
          <input
            id="conversation-word"
            value={missingWord}
            onChange={(event) => setMissingWord(event.target.value)}
            autoComplete="off"
          />
        </div>

        {missingWord.trim() ? (
          <div className="field">
            <label htmlFor="conversation-word-context">
              Quelle idée voulais-tu exprimer ?
            </label>
            <input
              id="conversation-word-context"
              value={missingWordContext}
              onChange={(event) => setMissingWordContext(event.target.value)}
              required
              autoComplete="off"
            />
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="conversation-block">
            Quelle formulation corrigée veux-tu réutiliser après un blocage ?
          </label>
          <input
            id="conversation-block"
            value={blockingMoment}
            onChange={(event) => setBlockingMoment(event.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="conversation-expression">
            Une expression utile entendue ou utilisée ?
          </label>
          <input
            id="conversation-expression"
            value={expressionToReuse}
            onChange={(event) => setExpressionToReuse(event.target.value)}
            autoComplete="off"
          />
        </div>

        {expressionToReuse.trim() ? (
          <div className="field">
            <label htmlFor="conversation-intent">À quoi sert cette expression ?</label>
            <input
              id="conversation-intent"
              value={expressionIntent}
              onChange={(event) => setExpressionIntent(event.target.value)}
              required
              autoComplete="off"
            />
          </div>
        ) : null}

        <button type="submit" className="button button--block" disabled={!valid}>
          Enregistrer la conversation
        </button>
      </form>
    </section>
  )
}
