import { useEffect, useMemo, useReducer, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import { TimerPersistenceContext } from '../../components/Timer/TimerPersistence'
import type { TimerPersistence } from '../../components/Timer/TimerPersistence'
import { Confetti, IconTile, MiniStat, SkipButton } from '../../components/ui'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { runAiTask } from '../../services/ai/client'
import { buildSessionPlan } from '../../services/review/selectPlan'
import {
  applyGapResult,
  applyQuestionRatings,
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
import { useAiEnabled } from '../ai/useAiEnabled'
import { ChunksExercise } from './components/ChunksExercise'
import { Fluency432Exercise } from './components/Fluency432Exercise'
import { SessionFeedbackView } from './components/SessionFeedback'
import { SessionHeader } from './components/SessionHeader'
import { RepriseExercise } from './components/RepriseExercise'
import { SurpriseQuestionsExercise } from './components/SurpriseQuestionsExercise'
import { TabooExercise } from './components/TabooExercise'
import { WordGapsExercise } from './components/WordGapsExercise'
import { ZappingExercise } from './components/ZappingExercise'
import {
  activeStages,
  createSessionState,
  getCurrentStage,
  prepSeconds,
  roundSecondsOf,
  sessionReducer,
} from './sessionReducer'
import type { SessionMode, TrainingSessionState } from './types'
import {
  MODE_LABELS,
  QUESTION_REVIEW_DAYS,
  TRAINING_SESSION_SCHEMA,
  speakingSecondsForLevel,
} from './types'
import { useFluencyRecordings } from './useFluencyRecordings'
import { retryKey, speakingKey, useQuestionRecordings } from './useQuestionRecordings'
import type { QuestionRecordings } from './useQuestionRecordings'
import './training.css'

function sessionDurationMinutes(session: TrainingSessionState): number {
  const elapsed = Date.now() - new Date(session.startedAt).getTime()
  return Math.max(1, Math.ceil(elapsed / 60000))
}

function practisedQuestionIds(session: TrainingSessionState): string[] {
  const ids = session.plan.questions.map((question) => question.id)
  if (session.zapping?.stage === 'done') {
    for (const question of session.plan.zappingQuestions ?? []) ids.push(question.id)
  }
  return ids
}

function parseMode(value: string | null): SessionMode {
  return value === 'short' || value === 'conversation' ? value : 'full'
}

/** The taboo monologue is on screen once the word gaps are over. */
function inTaboo(session: TrainingSessionState): boolean {
  return Boolean(session.plan.taboo) && session.gaps.index >= session.plan.gapItems.length
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
        <li>
          {plan.constantTime ? '3 / 3 / 3' : '4 → 3 → 2'} terminé
          {plan.retellingStory ? ' (variante retelling)' : ''}
        </li>
        {session.repriseDone && plan.repriseTopic ? (
          <li>Sujet repris : {plan.repriseTopic.title}</li>
        ) : null}
        {plan.questions.length > 0 ? (
          <li>
            {session.questionRetries ?? 0} question(s) refaite(s)
            {session.zapping?.stage === 'done' ? ' + zapping' : ''}
          </li>
        ) : null}
        {plan.gapItems.length > 0 ? <li>{plan.gapItems.length} mots travaillés</li> : null}
        {session.taboo?.rating ? <li>Monologue tabou terminé</li> : null}
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
    const rounds = roundSecondsOf(plan).length
    const done = session.fluency.roundIndex + (session.fluency.stage === 'summary' ? 1 : 0)
    return done / rounds
  }
  if (stage === 'reprise') return session.reprise.stage === 'running' ? 0.5 : 0
  if (stage === 'questions') {
    const zapping = plan.zappingQuestions ?? []
    const total = plan.questions.length + (zapping.length > 0 ? 1 : 0)
    const zappingDone = session.zapping.stage === 'running' ? session.zapping.index / zapping.length : 0
    return (Math.min(session.questions.index, plan.questions.length) + zappingDone) / Math.max(1, total)
  }
  if (stage === 'gaps') {
    const total = plan.gapItems.length + (plan.taboo ? 1 : 0)
    return Math.min(session.gaps.index, total) / Math.max(1, total)
  }
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
    case 'reprise':
      return { label: 'Passer la reprise', run: () => dispatch({ type: 'REPRISE_DONE' }) }
    case 'questions':
      if (session.questions.index >= session.plan.questions.length) {
        return { label: 'Passer le zapping', run: () => dispatch({ type: 'ZAPPING_DONE' }) }
      }
      return { label: 'Passer cette question', run: () => dispatch({ type: 'QUESTION_SKIP' }) }
    case 'gaps':
      if (inTaboo(session)) {
        return { label: 'Passer le monologue', run: () => dispatch({ type: 'TABOO_SKIP' }) }
      }
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
  const [searchParams] = useSearchParams()
  const requestedMode = parseMode(searchParams.get('mode'))

  const initialSession = useMemo<TrainingSessionState | null>(() => {
    // An unfinished session saved by an older version restarts cleanly.
    if (state.inProgressSession?.schema === TRAINING_SESSION_SCHEMA) {
      return state.inProgressSession
    }
    try {
      const plan = buildSessionPlan(state, Math.random, requestedMode)
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
  const questionRecordings = useQuestionRecordings(sessionRecorder, session)

  // The microphone stays open across the rounds, the reprise, the questions
  // and the taboo monologue, then is handed back.
  const currentStage = session ? getCurrentStage(session) : null
  const microphoneInUse =
    Boolean(session) &&
    session.phase === 'active' &&
    ((currentStage === 'fluency' && session.fluency.stage !== 'summary') ||
      currentStage === 'reprise' ||
      currentStage === 'questions' ||
      (currentStage === 'gaps' && inTaboo(session)))
  const releaseMicrophone = sessionRecorder.release
  useEffect(() => {
    if (!microphoneInUse) releaseMicrophone()
  }, [microphoneInUse, releaseMicrophone])

  const sessionRef = useRef(session)
  sessionRef.current = session

  // With the AI on, the transfer subject is written once the first round has
  // started, long before round 4, from the subject the learner is working on.
  const aiEnabled = useAiEnabled()
  const wantsTransfer =
    aiEnabled &&
    Boolean(session) &&
    session.phase === 'active' &&
    getCurrentStage(session) === 'fluency' &&
    (session.fluency.stage !== 'prep' || session.fluency.roundIndex > 0) &&
    session.fluency.roundIndex < roundSecondsOf(session.plan).length - 1 &&
    !session.fluency.transferPrompt
  const topicId = session?.plan.topic.id
  useEffect(() => {
    const topic = sessionRef.current?.plan.topic
    if (!wantsTransfer || !topic) return
    let cancelled = false
    runAiTask<{ text: string }>('transfer-topic', {
      title: topic.title,
      category: topic.category,
      transferPrompt: topic.transferPrompt,
    })
      .then(({ data }) => {
        if (!cancelled) dispatch({ type: 'FLUENCY_SET_TRANSFER', prompt: data.text })
      })
      // Any failure keeps the subject written in the content files.
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [wantsTransfer, topicId])

  useEffect(() => {
    if (!session || session.phase === 'complete') return
    updateWith((prev) => setInProgressSession(prev, session))
  }, [session, updateWith])

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
      ...(session.repriseDone && plan.repriseTopic ? { repriseTopicId: plan.repriseTopic.id } : {}),
      ...(session.taboo?.stage === 'done' && plan.taboo ? { tabooId: plan.taboo.id } : {}),
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
        constantTime: Boolean(plan.constantTime),
        questionRetries: session.questionRetries ?? 0,
        zappingDone: session.zapping?.stage === 'done',
        ...(session.taboo?.rating ? { tabooRating: session.taboo.rating } : {}),
        mode: plan.mode ?? 'full',
      },
    }

    updateWith((prev) => {
      let next = recordCompletedSession(prev, record)
      next = applyQuestionRatings(next, session.questionRatings, now, QUESTION_REVIEW_DAYS)

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
  const stages = activeStages(session.plan)
  const listening = sessionRecorder.status === 'recording'
  const currentKey = speakingKey(session)

  return (
    <TimerPersistenceContext.Provider value={timerPersistence}>
    <div className="training">
      <SessionHeader
        stage={session.phase === 'active' ? stage : null}
        phase={session.phase}
        stageIndex={session.stageIndex}
        stageProgress={stageProgress(session)}
        stages={stages}
      />
      {session.phase === 'active' && session.plan.mode && session.plan.mode !== 'full' && session.stageIndex === 0 ? (
        <p className="pill pill--soft">{MODE_LABELS[session.plan.mode]}</p>
      ) : null}

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
          topic={{
            ...session.plan.topic,
            transferPrompt: session.fluency.transferPrompt ?? session.plan.topic.transferPrompt,
          }}
          aiTransfer={Boolean(session.fluency.transferPrompt)}
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
          roundSeconds={roundSecondsOf(session.plan)}
          constantTime={Boolean(session.plan.constantTime)}
          onKeywordsChange={(keywords) =>
            dispatch({ type: 'FLUENCY_SET_KEYWORDS', keywords })
          }
          onRecordAllChange={(recordAll) =>
            dispatch({ type: 'FLUENCY_SET_RECORD_ALL', recordAll })
          }
          onStartRound={() => dispatch({ type: 'FLUENCY_START' })}
          onBeginRound={() => dispatch({ type: 'FLUENCY_BEGIN' })}
          onRoundComplete={() => dispatch({ type: 'FLUENCY_ROUND_COMPLETE' })}
          onSummaryDone={() => dispatch({ type: 'FLUENCY_SUMMARY_DONE' })}
          onSubmitFeedback={(values) =>
            dispatch({ type: 'FLUENCY_SUBMIT_FEEDBACK', ...values })
          }
        />
      ) : null}

      {session.phase === 'active' && stage === 'reprise' && session.plan.repriseTopic ? (
        <RepriseExercise
          topic={session.plan.repriseTopic}
          stage={session.reprise.stage}
          recording={listening && currentKey !== null}
          onStart={() => dispatch({ type: 'REPRISE_START' })}
          onDone={() => dispatch({ type: 'REPRISE_DONE' })}
        />
      ) : null}

      {session.phase === 'active' && stage === 'questions' ? (
        <QuestionsRenderer
          session={session}
          onSession={dispatch}
          recordings={questionRecordings}
          recording={listening && currentKey !== null}
        />
      ) : null}

      {session.phase === 'active' && stage === 'gaps' && inTaboo(session) && session.plan.taboo ? (
        <TabooExercise
          taboo={session.plan.taboo}
          stage={session.taboo.stage}
          recording={listening && currentKey !== null}
          onStart={() => dispatch({ type: 'TABOO_START' })}
          onSpoken={() => dispatch({ type: 'TABOO_SPOKEN' })}
          onRate={(rating) => dispatch({ type: 'TABOO_RATE', rating })}
        />
      ) : null}

      {session.phase === 'active' && stage === 'gaps' && !inTaboo(session) && session.plan.gapItems[session.gaps.index] ? (
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
          questionClips={session.plan.questions
            .filter((question) => questionRecordings[question.id] || questionRecordings[retryKey(question.id)])
            .map((question) => ({
              question: question.text,
              before: questionRecordings[question.id] ?? null,
              after: questionRecordings[retryKey(question.id)] ?? null,
            }))}
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
  recordings,
  recording,
}: {
  session: TrainingSessionState
  onSession: (action: Parameters<typeof sessionReducer>[1]) => void
  recordings: QuestionRecordings
  recording: boolean
}) {
  const plan = session.plan

  if (session.questions.index >= plan.questions.length) {
    return (
      <ZappingExercise
        questions={plan.zappingQuestions ?? []}
        stage={session.zapping.stage}
        index={session.zapping.index}
        recording={recording}
        onStart={() => onSession({ type: 'ZAPPING_START' })}
        onNext={() => onSession({ type: 'ZAPPING_NEXT' })}
      />
    )
  }

  const question = plan.questions[session.questions.index]
  if (!question) return null
  const isLastQuestion = session.questions.index === plan.questions.length - 1

  return (
    <SurpriseQuestionsExercise
      key={`question-${session.questions.index}-${session.questions.stage}`}
      question={question}
      index={session.questions.index}
      total={plan.questions.length}
      stage={session.questions.stage}
      prepSeconds={prepSeconds(session)}
      speakingSeconds={speakingSecondsForLevel(session.level)}
      advanced={session.level === 3 && isLastQuestion}
      chunksOfDay={plan.chunksOfDay}
      focusWords={plan.focusWords}
      recording={recording}
      firstAnswerUrl={recordings[question.id] ?? null}
      note={session.questionNotes?.[question.id] ?? ''}
      onCountdownDone={() => onSession({ type: 'QUESTION_COUNTDOWN_DONE' })}
      onPrepDone={() => onSession({ type: 'QUESTION_PREP_DONE' })}
      onSpeakingDone={() => onSession({ type: 'QUESTION_SPEAKING_DONE' })}
      onRate={(rating) => onSession({ type: 'QUESTION_RATE', rating })}
      onNoteChange={(note) => onSession({ type: 'QUESTION_NOTE_SET', note })}
      onNoteDone={() => onSession({ type: 'QUESTION_NOTE_DONE' })}
      onRetryDone={() => onSession({ type: 'QUESTION_RETRY_DONE' })}
    />
  )
}
