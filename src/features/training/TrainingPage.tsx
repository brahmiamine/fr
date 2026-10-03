import { useEffect, useMemo, useReducer, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import { TimerPersistenceContext } from '../../components/Timer/TimerPersistence'
import type { TimerPersistence } from '../../components/Timer/TimerPersistence'
import { Confetti, IconTile, MiniStat, SkipButton } from '../../components/ui'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { buildSessionPlan } from '../../services/review/selectPlan'
import {
  applyGapResult,
  captureWordGap,
  markFluencyNoteUsed,
  recordCompletedSession,
  setInProgressSession,
  toLocalDateString,
  trainingLevelForSessions,
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
import {
  FLUENCY_ROUND_SECONDS,
  TRAINING_SESSION_SCHEMA,
  speakingSecondsForLevel,
} from './types'
import { useFluencyRecordings } from './useFluencyRecordings'
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
    <section className="card card--pop card--center celebration">
      <Confetti />
      <IconTile icon="feedback" size={64} iconSize={32} />
      <h1>Séance terminée</h1>
      <p className="muted">Tes blocages sont enregistrés : ils reviendront au bon moment.</p>
      <div className="mini-stats">
        <MiniStat value={`${sessionDurationMinutes(session)} min`} label="pratiqués" />
        <MiniStat value={`${(session.usedChunkIds ?? []).length}/${plan.chunksOfDay.length}`} label="chunks placés" />
        <MiniStat value={String(practisedQuestionIds(session).length)} label="questions" />
      </div>
      <ul className="summary-list">
        <li>{plan.chunks.length} chunks travaillés</li>
        <li>{plan.gapItems.length} mots travaillés</li>
        <li>{practisedQuestionIds(session).length} questions spontanées</li>
        <li>
          4 → 3 → 2 terminé{plan.retellingStory ? ' (variante retelling)' : ''}
        </li>
      </ul>
      <div className="button-row">
        <Link className="button button--block" to="/progress">
          Voir ma progression
        </Link>
        <Link className="button button--subtle button--block" to="/">
          Retour à l'accueil
        </Link>
      </div>
    </section>
  )
}

/** Share of the current stage already done, for the header bar. */
function stageProgress(session: TrainingSessionState): number {
  const stage = getCurrentStage(session)
  const plan = session.plan
  if (stage === 'chunks') return session.chunks.index / Math.max(1, plan.chunks.length)
  if (stage === 'fluency') {
    const rounds = FLUENCY_ROUND_SECONDS.length
    const done = session.fluency.roundIndex + (session.fluency.stage === 'summary' ? 1 : 0)
    return done / rounds
  }
  if (stage === 'questions') return session.questions.index / Math.max(1, plan.questions.length)
  if (stage === 'gaps') return session.gaps.index / Math.max(1, plan.gapItems.length)
  return 0.5
}

/** The "Passer" action of the current exercise, or null when there is nothing to skip. */
function skipFor(
  session: TrainingSessionState,
  stage: ReturnType<typeof getCurrentStage>,
  dispatch: (action: Parameters<typeof sessionReducer>[1]) => void,
): { label: string; run: () => void } | null {
  if (session.phase !== 'active') return null
  switch (stage) {
    case 'chunks':
      if (session.chunks.step === 'day') return null
      return { label: 'Passer ce chunk', run: () => dispatch({ type: 'CHUNK_SKIP' }) }
    case 'fluency':
      if (session.fluency.stage === 'summary') {
        return { label: 'Passer le résumé', run: () => dispatch({ type: 'FLUENCY_SUMMARY_DONE' }) }
      }
      return { label: 'Passer ce tour', run: () => dispatch({ type: 'FLUENCY_SKIP' }) }
    case 'questions':
      if (session.revenge.stage !== 'idle' && session.revenge.stage !== 'done') {
        return { label: 'Passer la revanche', run: () => dispatch({ type: 'REVENGE_DONE' }) }
      }
      return { label: 'Passer cette question', run: () => dispatch({ type: 'QUESTION_SKIP' }) }
    case 'gaps':
      return { label: 'Passer ce mot', run: () => dispatch({ type: 'GAP_NEXT' }) }
    case 'feedback':
      return { label: 'Passer le feedback', run: () => dispatch({ type: 'FEEDBACK_SKIP' }) }
    default:
      return null
  }
}

export default function TrainingPage() {
  const { state, updateWith } = useAppState()
  const sessionRecorder = useAudioRecorder({ keepStream: true })

  const initialSession = useMemo<TrainingSessionState | null>(() => {
    // An unfinished session saved by an older version restarts cleanly.
    if (state.inProgressSession?.schema === TRAINING_SESSION_SCHEMA) {
      return state.inProgressSession
    }
    try {
      const plan = buildSessionPlan(state)
      return createSessionState(plan, trainingLevelForSessions(state.sessions))
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

  const roundRecordings = useFluencyRecordings(sessionRecorder, session?.fluency)

  // The microphone stays open across the four rounds, then is handed back.
  const fluencyRecording =
    Boolean(session) &&
    getCurrentStage(session) === 'fluency' &&
    session.fluency.stage !== 'summary'
  const releaseMicrophone = sessionRecorder.release
  useEffect(() => {
    if (!fluencyRecording) releaseMicrophone()
  }, [fluencyRecording, releaseMicrophone])

  useEffect(() => {
    if (!session || session.phase === 'complete') return
    updateWith((prev) => setInProgressSession(prev, session))
  }, [session, updateWith])

  const sessionRef = useRef(session)
  sessionRef.current = session
  const timerPersistence = useMemo<TimerPersistence>(
    () => ({
      get: (key) => sessionRef.current?.timers?.[key] ?? null,
      save: (key, snapshot) => {
        const hasEntry = Boolean(sessionRef.current?.timers?.[key])
        if (!snapshot && !hasEntry) return
        dispatch({ type: 'TIMER_SAVE', key, snapshot })
      },
    }),
    [],
  )

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
    const questionBlocks = { none: 0, some: 0, much: 0 }
    for (const entry of session.questionRatings) questionBlocks[entry.rating] += 1

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
        chunksUsed: (session.usedChunkIds ?? []).length,
        questionBlocks,
        retelling: Boolean(plan.retellingStory),
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
      next = upsertPersonalChunk(
        next,
        session.fluencyFeedback.missedChunk ?? '',
        session.fluencyFeedback.missedChunkIntent ?? '',
        now,
      )

      for (const capture of session.gapCaptures ?? []) {
        next = captureWordGap(next, capture.target, capture.context, now)
      }

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
        <section className="card">
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
  const skip = skipFor(session, stage, dispatch)

  return (
    <TimerPersistenceContext.Provider value={timerPersistence}>
    <div className="training">
      <SessionHeader
        stage={session.phase === 'active' ? stage : null}
        phase={session.phase}
        stageIndex={session.stageIndex}
        stageProgress={stageProgress(session)}
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
          isNew={(session.plan.newChunkIds ?? []).includes(
            session.plan.chunks[session.chunks.index]?.id ?? '',
          )}
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
          recordAll={session.fluency.recordAll}
          recordings={roundRecordings}
          retellingStory={session.plan.retellingStory ?? null}
          prosodyFocusGoal={session.plan.prosodyFocusGoal ?? null}
          onKeywordsChange={(keywords) =>
            dispatch({ type: 'FLUENCY_SET_KEYWORDS', keywords })
          }
          onRecordAllChange={(recordAll) =>
            dispatch({ type: 'FLUENCY_SET_RECORD_ALL', recordAll })
          }
          onStartRound={() => dispatch({ type: 'FLUENCY_START' })}
          onRoundComplete={() => dispatch({ type: 'FLUENCY_ROUND_COMPLETE' })}
          onSummaryDone={() => dispatch({ type: 'FLUENCY_SUMMARY_DONE' })}
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
          capturedContext={
            (session.gapCaptures ?? []).find(
              (capture) =>
                capture.target === session.plan.gapItems[session.gaps.index]?.target,
            )?.context ?? ''
          }
          onFound={() => dispatch({ type: 'GAP_FOUND' })}
          onVerify={(correct) => dispatch({ type: 'GAP_VERIFY', correct })}
          onCapture={(context) => dispatch({ type: 'GAP_CAPTURE', context })}
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
          chunksOfDay={session.plan.chunksOfDay}
          usedChunkIds={session.usedChunkIds ?? []}
          onToggleChunk={(chunkId) => dispatch({ type: 'CHUNK_TOGGLE_USED', chunkId })}
          onChange={(field, value) =>
            dispatch({ type: 'FEEDBACK_SET', field, value })
          }
          onSubmit={() => dispatch({ type: 'FEEDBACK_SUBMIT' })}
        />
      ) : null}

      {skip ? <SkipButton onClick={skip.run}>{skip.label}</SkipButton> : null}
    </div>
    </TimerPersistenceContext.Provider>
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
        <section className="card card--center">
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
        speakingSeconds={speakingSecondsForLevel(session.level)}
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
      speakingSeconds={speakingSecondsForLevel(session.level)}
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
