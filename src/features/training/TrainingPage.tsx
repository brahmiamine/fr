import { useEffect, useMemo, useReducer, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import { contentRepository } from '../../services/content/contentRepository'
import { buildSessionContent } from '../../services/content/selectContent'
import {
  recordCompletedSession,
  setInProgressSession,
  toLocalDateString,
  upsertExpressionExamples,
} from '../../services/progress/progress'
import type { SessionRecord } from '../../types/progress'
import { Fluency432Exercise } from './components/Fluency432Exercise'
import { NaturalFrenchExercise } from './components/NaturalFrenchExercise'
import { ParaphraseExercise } from './components/ParaphraseExercise'
import { SessionHeader } from './components/SessionHeader'
import { SessionReview } from './components/SessionReview'
import { SurpriseQuestionsExercise } from './components/SurpriseQuestionsExercise'
import {
  createSessionState,
  getCurrentExercise,
  resolveContent,
  sessionReducer,
} from './sessionReducer'
import type { TrainingSessionState } from './types'
import './training.css'

function sessionDurationMinutes(session: TrainingSessionState): number {
  const started = new Date(session.startedAt).getTime()
  const elapsed = Date.now() - started
  const minutes = Math.ceil(elapsed / 60000)
  return Math.max(1, minutes)
}

interface SessionLoaderProps {
  session: TrainingSessionState
  onSession: (action: Parameters<typeof sessionReducer>[1]) => void
}

function CompletedScreen() {
  return (
    <section className="card exercise exercise--center">
      <h1>Bravo, session terminée ! 🎉</h1>
      <p className="muted">
        Ton travail est enregistré localement. Reviens demain pour garder ta
        série.
      </p>
      <div className="stack">
        <Link className="button button--block" to="/progress">
          Voir ma progression
        </Link>
        <Link className="button button--ghost button--block" to="/">
          Retour à l'accueil
        </Link>
      </div>
    </section>
  )
}

function ActiveExercise({ session, onSession }: SessionLoaderProps) {
  const exercise = getCurrentExercise(session)
  const content = useMemo(
    () => resolveContent(session.content, contentRepository),
    [session.content],
  )

  if (!content) {
    return (
      <section className="card exercise">
        <h1>Contenu introuvable</h1>
        <p className="muted">
          Un contenu de la session a peut-être été supprimé. Quitte puis
          recommence pour une nouvelle sélection.
        </p>
        <Link className="button button--block" to="/">
          Retour à l'accueil
        </Link>
      </section>
    )
  }

  if (exercise === 'fluency432') {
    return (
      <Fluency432Exercise
        key={`fluency-${session.fluency.roundIndex}-${session.fluency.stage}`}
        topic={content.topic}
        roundIndex={session.fluency.roundIndex}
        stage={session.fluency.stage}
        reflection={session.reflection}
        onRoundComplete={() => onSession({ type: 'FLUENCY_ROUND_COMPLETE' })}
        onReflectionSubmit={(values) =>
          onSession({ type: 'SUBMIT_REFLECTION', ...values })
        }
      />
    )
  }

  if (exercise === 'paraphrase') {
    const word = content.paraphraseWords[session.paraphrase.index]
    if (!word) return null
    return (
      <ParaphraseExercise
        key={`paraphrase-${session.paraphrase.index}`}
        word={word}
        index={session.paraphrase.index}
        total={content.paraphraseWords.length}
        onNext={() => onSession({ type: 'PARAPHRASE_NEXT' })}
        onFinishEarly={() => onSession({ type: 'PARAPHRASE_FINISH' })}
      />
    )
  }

  if (exercise === 'questions') {
    const question = content.questions[session.questions.index]
    if (!question) return null
    return (
      <SurpriseQuestionsExercise
        key={`questions-${session.questions.index}-${session.questions.stage}`}
        question={question}
        index={session.questions.index}
        total={content.questions.length}
        stage={session.questions.stage}
        onCountdownDone={() => onSession({ type: 'QUESTION_COUNTDOWN_DONE' })}
        onNext={() => onSession({ type: 'QUESTION_NEXT' })}
        onFinishEarly={() => onSession({ type: 'QUESTIONS_FINISH' })}
      />
    )
  }

  if (exercise === 'natural') {
    const expression = content.expressions[session.natural.index]
    if (!expression) return null
    return (
      <NaturalFrenchExercise
        key={`natural-${session.natural.index}`}
        expression={expression}
        index={session.natural.index}
        total={content.expressions.length}
        examples={session.examples[expression.id] ?? []}
        onChangeExample={(exampleIndex, value) =>
          onSession({
            type: 'SET_EXAMPLE',
            expressionId: expression.id,
            index: exampleIndex,
            value,
          })
        }
        onNext={() => onSession({ type: 'NATURAL_NEXT' })}
      />
    )
  }

  return null
}

export default function TrainingPage() {
  const { state, updateWith } = useAppState()

  const initialSession = useMemo<TrainingSessionState | null>(() => {
    if (state.inProgressSession) return state.inProgressSession
    try {
      const content = buildSessionContent(contentRepository, {
        topicIds: state.recentTopicIds,
        questionIds: state.recentQuestionIds,
        wordIds: state.recentWordIds,
        expressionIds: state.recentExpressionIds,
      })
      return createSessionState(content)
    } catch {
      return null
    }
    // The session is created exactly once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [session, dispatch] = useReducer(
    sessionReducer,
    initialSession as TrainingSessionState,
  )

  // Persist the in-progress session after every meaningful change.
  useEffect(() => {
    if (!session || session.phase === 'complete') return
    updateWith((prev) => setInProgressSession(prev, session))
  }, [session, updateWith])

  const finalizedRef = useRef(false)
  useEffect(() => {
    if (!session || session.phase !== 'complete' || finalizedRef.current) return
    finalizedRef.current = true

    const content = resolveContent(session.content, contentRepository)
    if (!content) return

    const now = new Date()
    const record: SessionRecord = {
      id: session.sessionId,
      date: toLocalDateString(now),
      completedAt: now.toISOString(),
      durationMinutes: sessionDurationMinutes(session),
      blockCount: session.review.blockCount ?? 0,
      fluencyScore: session.review.fluencyScore ?? 3,
      successParaphrase: session.review.successParaphrase,
      expressionToReuse: session.review.expressionToReuse,
      errorToWatch: session.review.errorToWatch,
      topicId: session.content.topicId,
      questionIds: session.content.questionIds,
      wordIds: session.content.wordIds,
      expressionIds: session.content.expressionIds,
    }

    updateWith((prev) => {
      let next = recordCompletedSession(prev, record)
      for (const expression of content.expressions) {
        const sentences = (session.examples[expression.id] ?? [])
          .map((sentence) => sentence.trim())
          .filter(Boolean)
        if (sentences.length > 0) {
          next = upsertExpressionExamples(next, {
            expressionId: expression.id,
            sentences,
            updatedAt: now.toISOString(),
          })
        }
      }
      return next
    })
  }, [session, updateWith])

  if (!session) {
    return (
      <div className="stack">
        <SessionHeader exercise={null} phase="exercise" />
        <section className="card exercise">
          <h1>Contenu indisponible</h1>
          <p className="muted">
            Les fichiers de contenu n'ont pas pu être chargés. Vérifie les
            fichiers JSON puis recharge la page.
          </p>
          <Link className="button button--block" to="/">
            Retour à l'accueil
          </Link>
        </section>
      </div>
    )
  }

  const content = resolveContent(session.content, contentRepository)

  return (
    <div className="training">
      <SessionHeader
        exercise={getCurrentExercise(session)}
        phase={session.phase}
      />

      {session.phase === 'exercise' ? (
        <ActiveExercise session={session} onSession={dispatch} />
      ) : null}

      {session.phase === 'review' ? (
        <SessionReview
          review={session.review}
          expressionOptions={content?.expressions.map((item) => item.expression) ?? []}
          onChange={(field, value) =>
            dispatch({ type: 'UPDATE_REVIEW', field, value })
          }
          onSubmit={() => dispatch({ type: 'SUBMIT_REVIEW' })}
        />
      ) : null}

      {session.phase === 'complete' ? <CompletedScreen /> : null}
    </div>
  )
}
