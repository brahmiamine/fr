import { useEffect, useMemo, useReducer, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import { Confetti } from '../../components/Decor/Decor'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { buildSessionPlan } from '../../services/review/selectPlan'
import {
  applyGapResult,
  captureWordGap,
  markFluencyNoteUsed,
  recordCompletedSession,
  setInProgressSession,
  toLocalDateString,
  trainingLevelForSessionCount,
  upsertChunkReview,
  upsertFluencyNote,
  upsertPersonalChunk,
} from '../../services/progress/progress'
import type { SessionRecord } from '../../types/progress'
import { ChunksExercise } from './components/ChunksExercise'
import { Fluency432Exercise } from './components/Fluency432Exercise'
import { SessionFeedbackView } from './components/SessionFeedback'
import { SessionHeader } from './components/SessionHeader'
import { SurpriseQuestionsExercise } from './components/SurpriseQuestionsExercise'
import { WordGapsExercise } from './components/WordGapsExercise'
import {
  createSessionState,
  getCurrentStage,
  prepSeconds,
  sessionReducer,
} from './sessionReducer'
import type { TrainingSessionState } from './types'
import './training.css'

function sessionDurationMinutes(session: TrainingSessionState): number {
  const elapsed = Date.now() - new Date(session.startedAt).getTime()
  return Math.max(1, Math.ceil(elapsed / 60000))
}

function practisedQuestionIds(session: TrainingSessionState): string[] {
  const ids = session.plan.questions.map((question) => question.id)
  if (session.level === 3 && session.plan.pivotQuestion) {
    ids.push(session.plan.pivotQuestion.id)
  }
  return ids
}

function CompletedScreen({ session }: { session: TrainingSessionState }) {
  const plan = session.plan
  return (
    <section className="card exercise exercise--center">
      <Confetti />
      <h1>Séance terminée</h1>
      <p className="exercise__expression">{sessionDurationMinutes(session)} min</p>
      <ul className="summary-list">
        <li>{plan.chunks.length} chunks travaillés</li>
        <li>{plan.gapItems.length} mots travaillés</li>
        <li>{practisedQuestionIds(session).length} questions spontanées</li>
        <li>4 → 3 → 2 terminé</li>
      </ul>
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

export default function TrainingPage() {
  const { state, updateWith } = useAppState()
  const sessionRecorder = useAudioRecorder()

  const initialSession = useMemo<TrainingSessionState | null>(() => {
    if (state.inProgressSession) return state.inProgressSession
    try {
      const plan = buildSessionPlan(state)
      return createSessionState(
        plan,
        trainingLevelForSessionCount(state.sessions.length),
      )
    } catch {
      return null
    }
    // Built exactly once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [session, dispatch] = useReducer(
    sessionReducer,
    initialSession as TrainingSessionState,
  )

  useEffect(() => {
    if (!session || session.phase === 'complete') return
    updateWith((prev) => setInProgressSession(prev, session))
  }, [session, updateWith])

  const finalizedRef = useRef(false)
  useEffect(() => {
    if (!session || session.phase !== 'complete' || finalizedRef.current) return
    finalizedRef.current = true

    const now = new Date()
    const plan = session.plan
    const genericWordIds = plan.gapItems
      .filter((item) => !item.isPersonal && item.sourceId)
      .map((item) => item.sourceId as string)

    const questionIds = practisedQuestionIds(session)

    const record: SessionRecord = {
      id: session.sessionId,
      date: toLocalDateString(now),
      completedAt: now.toISOString(),
      durationMinutes: sessionDurationMinutes(session),
      blockCount: session.feedback.blockCount ?? 0,
      fluencyScore: session.feedback.fluencyScore ?? 3,
      blockedWord: session.feedback.blockedWord,
      expressionToReuse: session.feedback.expressionToReuse,
      topicId: plan.topic.id,
      questionIds,
      chunkIds: plan.chunks.map((chunk) => chunk.id),
      genericWordIds,
      summary: {
        chunksWorked: plan.chunks.length,
        gapsPracticed: plan.gapItems.length,
        questionsAsked: questionIds.length,
        fluencyDone: true,
      },
    }

    updateWith((prev) => {
      let next = recordCompletedSession(prev, record)

      for (const result of session.chunkResults) {
        next = upsertChunkReview(next, result.chunkId, result.result, now)
      }

      for (const result of session.gapResults) {
        const item = plan.gapItems.find((gap) => gap.key === result.itemKey)
        if (item?.isPersonal && item.sourceId) {
          next = applyGapResult(next, item.sourceId, result.found, now)
        }
      }

      next = captureWordGap(
        next,
        session.fluencyFeedback.missingWord,
        session.fluencyFeedback.missingWordContext,
        now,
      )
      next = captureWordGap(
        next,
        session.feedback.blockedWord,
        session.feedback.blockedWordContext,
        now,
      )

      next = upsertFluencyNote(
        next,
        'difficultPhrase',
        session.fluencyFeedback.difficultPhrase,
        now,
      )
      next = upsertFluencyNote(
        next,
        'importantError',
        session.fluencyFeedback.importantError,
        now,
      )
      next = upsertFluencyNote(
        next,
        'abandonedSentence',
        session.feedback.abandonedSentence,
        now,
      )
      next = upsertFluencyNote(
        next,
        'awkwardPhrase',
        session.feedback.awkwardPhrase,
        now,
      )

      next = upsertPersonalChunk(
        next,
        session.feedback.expressionToReuse,
        session.feedback.expressionIntent,
        now,
      )

      for (const reminderId of session.usedFluencyReminderIds ?? []) {
        next = markFluencyNoteUsed(next, reminderId, now)
      }

      return next
    })
  }, [session, updateWith])

  if (!session) {
    return (
      <div className="stack">
        <SessionHeader stage={null} phase="active" stageIndex={0} />
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

  const stage = getCurrentStage(session)

  return (
    <div className="training">
      <SessionHeader
        stage={session.phase === 'active' ? stage : null}
        phase={session.phase}
        stageIndex={session.stageIndex}
      />

      {session.phase === 'complete' ? <CompletedScreen session={session} /> : null}

      {session.phase === 'active' && stage === 'chunks' ? (
        <ChunksExercise
          key={`chunk-${session.chunks.index}-${session.chunks.step}`}
          chunk={session.plan.chunks[session.chunks.index]}
          index={session.chunks.index}
          total={session.plan.chunks.length}
          step={session.chunks.step}
          chunksOfDay={session.plan.chunksOfDay}
          onReveal={() => dispatch({ type: 'CHUNK_REVEAL' })}
          onRate={(result) => dispatch({ type: 'CHUNK_RATE', result })}
          onContinue={() => dispatch({ type: 'CHUNKS_OF_DAY_CONTINUE' })}
        />
      ) : null}

      {session.phase === 'active' && stage === 'fluency' ? (
        <Fluency432Exercise
          key={`fluency-${session.fluency.roundIndex}`}
          topic={session.plan.topic}
          roundIndex={session.fluency.roundIndex}
          stage={session.fluency.stage}
          feedback={session.fluencyFeedback}
          keywords={session.fluency.keywords}
          chunksOfDay={session.plan.chunksOfDay}
          focusWords={session.plan.focusWords}
          fluencyReminders={session.plan.fluencyReminders}
          recorder={sessionRecorder}
          onKeywordsChange={(keywords) =>
            dispatch({ type: 'FLUENCY_SET_KEYWORDS', keywords })
          }
          onStartRound={() => dispatch({ type: 'FLUENCY_START' })}
          onRoundComplete={() => dispatch({ type: 'FLUENCY_ROUND_COMPLETE' })}
          onSubmitFeedback={(values) =>
            dispatch({ type: 'FLUENCY_SUBMIT_FEEDBACK', ...values })
          }
        />
      ) : null}

      {session.phase === 'active' && stage === 'questions' ? (
        <QuestionsRenderer session={session} onSession={dispatch} />
      ) : null}

      {session.phase === 'active' && stage === 'gaps' ? (
        <WordGapsExercise
          key={`gap-${session.gaps.index}-${session.gaps.step}`}
          item={session.plan.gapItems[session.gaps.index]}
          index={session.gaps.index}
          total={session.plan.gapItems.length}
          step={session.gaps.step}
          onFound={() => dispatch({ type: 'GAP_FOUND' })}
          onStartParaphrase={() => dispatch({ type: 'GAP_START_PARAPHRASE' })}
          onReveal={() => dispatch({ type: 'GAP_REVEAL' })}
          onNext={() => dispatch({ type: 'GAP_NEXT' })}
        />
      ) : null}

      {session.phase === 'active' && stage === 'feedback' ? (
        <SessionFeedbackView
          feedback={session.feedback}
          audioUrl={sessionRecorder.blobUrl}
          fluencyReminders={session.plan.fluencyReminders}
          usedReminderIds={session.usedFluencyReminderIds ?? []}
          onToggleReminder={(reminderId) =>
            dispatch({ type: 'FLUENCY_TOGGLE_REMINDER_USED', reminderId })
          }
          onChange={(field, value) =>
            dispatch({ type: 'FEEDBACK_SET', field, value })
          }
          onSubmit={() => dispatch({ type: 'FEEDBACK_SUBMIT' })}
        />
      ) : null}
    </div>
  )
}

function QuestionsRenderer({
  session,
  onSession,
}: {
  session: TrainingSessionState
  onSession: (action: Parameters<typeof sessionReducer>[1]) => void
}) {
  const plan = session.plan

  if (
    session.revenge.stage === 'countdown' ||
    session.revenge.stage === 'prep' ||
    session.revenge.stage === 'speaking'
  ) {
    const revengeQuestion =
      plan.questions.find(
        (question) => question.id === session.revenge.questionId,
      ) ??
      (plan.pivotQuestion?.id === session.revenge.questionId
        ? plan.pivotQuestion
        : undefined)
    if (!revengeQuestion) {
      return (
        <section className="card exercise exercise--center">
          <h2>Revanche</h2>
          <button
            type="button"
            className="button button--block"
            onClick={() => onSession({ type: 'REVENGE_DONE' })}
          >
            Continuer
          </button>
        </section>
      )
    }

    return (
      <SurpriseQuestionsExercise
        key={`revenge-${session.revenge.stage}`}
        question={revengeQuestion}
        index={0}
        total={plan.questions.length}
        stage={session.revenge.stage as 'countdown' | 'prep' | 'speaking'}
        prepSeconds={prepSeconds(session)}
        chunksOfDay={plan.chunksOfDay}
        focusWords={plan.focusWords}
        revenge
        onCountdownDone={() => onSession({ type: 'REVENGE_COUNTDOWN_DONE' })}
        onPrepDone={() => onSession({ type: 'REVENGE_PREP_DONE' })}
        onSpeakingDone={() => onSession({ type: 'REVENGE_DONE' })}
        onRate={() => undefined}
        onDone={() => onSession({ type: 'REVENGE_DONE' })}
      />
    )
  }

  const question = plan.questions[session.questions.index]
  if (!question) return null
  const isLastQuestion = session.questions.index === plan.questions.length - 1
  const pivotQuestion =
    session.level === 3 && isLastQuestion ? plan.pivotQuestion : null

  return (
    <SurpriseQuestionsExercise
      key={`question-${session.questions.index}-${session.questions.stage}`}
      question={question}
      index={session.questions.index}
      total={plan.questions.length}
      stage={session.questions.stage}
      prepSeconds={prepSeconds(session)}
      chunksOfDay={plan.chunksOfDay}
      focusWords={plan.focusWords}
      pivotQuestion={pivotQuestion}
      onCountdownDone={() => onSession({ type: 'QUESTION_COUNTDOWN_DONE' })}
      onPrepDone={() => onSession({ type: 'QUESTION_PREP_DONE' })}
      onSpeakingDone={() => onSession({ type: 'QUESTION_SPEAKING_DONE' })}
      onRate={(rating) => onSession({ type: 'QUESTION_RATE', rating })}
      onDone={() => undefined}
    />
  )
}
