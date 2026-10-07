import type {
  BlockRating,
  GapItem,
  QuestionStage,
  RecallResult,
  SessionPlan,
  StageKind,
  TrainingSessionState,
} from './types'
import {
  FLUENCY_ROUND_SECONDS,
  MAX_KEYWORDS,
  STAGE_ORDER,
  TRAINING_SESSION_SCHEMA,
  prepSecondsForLevel,
} from './types'
import type { SessionFeedback } from './types'
import type { TimerSnapshot } from '../../hooks/useCountdownTimer'

export type TrainingAction =
  | { type: 'CHUNK_REVEAL' }
  | { type: 'CHUNK_RATE'; result: RecallResult }
  | { type: 'CHUNK_SKIP' }
  | { type: 'CHUNKS_OF_DAY_CONTINUE' }
  | { type: 'FLUENCY_SET_KEYWORDS'; keywords: string[] }
  | { type: 'FLUENCY_SET_RECORD_ALL'; recordAll: boolean }
  | { type: 'FLUENCY_START' }
  | { type: 'FLUENCY_BEGIN' }
  | { type: 'FLUENCY_SET_TRANSFER'; prompt: string }
  | { type: 'FLUENCY_ROUND_COMPLETE' }
  | { type: 'FLUENCY_SKIP' }
  | { type: 'FLUENCY_SUMMARY_DONE' }
  | {
      type: 'FLUENCY_SUBMIT_FEEDBACK'
      missingWord: string
      missingWordContext: string
      difficultPhrase: string
      importantError: string
      missedChunk?: string
      missedChunkIntent?: string
    }
  | { type: 'REPRISE_START' }
  | { type: 'REPRISE_SPOKEN' }
  | { type: 'REPRISE_DONE' }
  | { type: 'QUESTION_COUNTDOWN_DONE' }
  | { type: 'QUESTION_PREP_DONE' }
  | { type: 'QUESTION_SPEAKING_DONE' }
  | { type: 'QUESTION_RATE'; rating: BlockRating }
  | { type: 'QUESTION_NOTE_SET'; note: string }
  | { type: 'QUESTION_WORD_SET'; word: string; idea: string }
  | { type: 'QUESTION_NOTE_DONE' }
  | { type: 'QUESTION_RETRY_DONE' }
  | { type: 'QUESTION_SKIP' }
  | { type: 'ZAPPING_START' }
  | { type: 'ZAPPING_NEXT' }
  | { type: 'ZAPPING_DONE' }
  | { type: 'GAP_FOUND' }
  | { type: 'GAP_VERIFY'; correct: boolean }
  | { type: 'GAP_CAPTURE'; context: string }
  | { type: 'GAP_START_PARAPHRASE' }
  | { type: 'GAP_REVEAL' }
  | { type: 'GAP_NEXT' }
  | { type: 'TABOO_START' }
  | { type: 'TABOO_SPOKEN' }
  | { type: 'TABOO_RATE'; rating: BlockRating }
  | { type: 'TABOO_SKIP' }
  | { type: 'FLUENCY_TOGGLE_REMINDER_USED'; reminderId: string }
  | { type: 'CHUNK_TOGGLE_USED'; chunkId: string }
  | {
      type: 'FEEDBACK_SET'
      field: keyof SessionFeedback
      value: string | number | null
    }
  | { type: 'FEEDBACK_SUBMIT' }
  | { type: 'FEEDBACK_SKIP' }
  | { type: 'TIMER_SAVE'; key: string; snapshot: TimerSnapshot | null }

export function createSessionId(now: Date = new Date()): string {
  return `s-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
}

function initialGapStep(item: GapItem | undefined): 'recall' | 'paraphrase' | 'revealed' {
  if (!item) return 'revealed'
  return item.kind === 'retrieve' ? 'recall' : 'paraphrase'
}

export function createSessionState(
  plan: SessionPlan,
  level: 1 | 2 | 3,
  now: Date = new Date(),
): TrainingSessionState {
  const state: TrainingSessionState = {
    schema: TRAINING_SESSION_SCHEMA,
    sessionId: createSessionId(now),
    startedAt: now.toISOString(),
    level,
    stageIndex: 0,
    phase: 'active',
    plan,
    chunks: { index: 0, step: 'retrieve' },
    chunkResults: [],
    chunksOfDayShown: false,
    usedChunkIds: [],
    usedFluencyReminderIds: [],
    fluency: { roundIndex: 0, stage: 'prep', keywords: [], recordAll: true },
    fluencyFeedback: {
      missingWord: '',
      missingWordContext: '',
      difficultPhrase: '',
      importantError: '',
      missedChunk: '',
      missedChunkIntent: '',
    },
    reprise: { stage: 'intro' },
    questions: { index: 0, stage: 'countdown' },
    questionRatings: [],
    questionNotes: {},
    questionWords: {},
    zapping: { stage: 'intro', index: 0 },
    gaps: { index: 0, step: initialGapStep(plan.gapItems[0]) },
    gapResults: [],
    gapCaptures: [],
    taboo: { stage: 'intro', rating: null },
    feedback: {
      blockedWord: '',
      blockedWordContext: '',
      abandonedSentence: '',
      awkwardPhrase: '',
      expressionToReuse: '',
      expressionIntent: '',
      blockCount: null,
      fluencyScore: null,
    },
  }
  return skipEmptyStages(state)
}

export function getCurrentStage(state: TrainingSessionState): StageKind {
  return STAGE_ORDER[state.stageIndex] ?? 'feedback'
}

/** Whether this session goes through `stage` (not skipped, and has content). */
export function stageIsActive(plan: SessionPlan, stage: StageKind): boolean {
  if ((plan.skippedStages ?? []).includes(stage)) return false
  if (stage === 'chunks') return plan.chunks.length > 0
  if (stage === 'reprise') return Boolean(plan.repriseTopic)
  if (stage === 'questions') {
    return plan.questions.length > 0 || (plan.zappingQuestions ?? []).length > 0
  }
  if (stage === 'gaps') return plan.gapItems.length > 0 || Boolean(plan.taboo)
  return true
}

/** The stages this session really goes through, in order. */
export function activeStages(plan: SessionPlan): StageKind[] {
  return STAGE_ORDER.filter((stage) => stageIsActive(plan, stage))
}

/** "Étape 2/4": the position among the stages this session really goes through. */
export function sessionStep(state: TrainingSessionState): { index: number; total: number } {
  // A session saved by an older version may lack its plan.
  if (!state?.plan) return { index: (state?.stageIndex ?? 0) + 1, total: STAGE_ORDER.length }
  const stages = activeStages(state.plan)
  const position = stages.indexOf(getCurrentStage(state))
  return { index: Math.max(0, position) + 1, total: Math.max(1, stages.length) }
}

function skipEmptyStages(state: TrainingSessionState): TrainingSessionState {
  let index = state.stageIndex
  while (index < STAGE_ORDER.length - 1 && !stageIsActive(state.plan, STAGE_ORDER[index])) {
    index += 1
  }
  return index === state.stageIndex ? state : { ...state, stageIndex: index }
}

export function isFeedbackValid(feedback: SessionFeedback): boolean {
  const blocksValid =
    feedback.blockCount !== null &&
    Number.isFinite(feedback.blockCount) &&
    feedback.blockCount >= 0
  const scoreValid =
    feedback.fluencyScore !== null &&
    Number.isInteger(feedback.fluencyScore) &&
    feedback.fluencyScore >= 1 &&
    feedback.fluencyScore <= 5
  const wordContextValid =
    !feedback.blockedWord.trim() || Boolean(feedback.blockedWordContext.trim())
  const expressionIntentValid =
    !feedback.expressionToReuse.trim() || Boolean(feedback.expressionIntent.trim())
  return blocksValid && scoreValid && wordContextValid && expressionIntentValid
}

export function prepSeconds(state: TrainingSessionState): number {
  return prepSecondsForLevel(state.level)
}

/** Length of each round of this session (4/3/2 or the weekly 3/3/3). */
export function roundSecondsOf(plan: SessionPlan): readonly number[] {
  return plan.roundSeconds?.length ? plan.roundSeconds : FLUENCY_ROUND_SECONDS
}

function advanceStage(state: TrainingSessionState): TrainingSessionState {
  if (state.stageIndex + 1 >= STAGE_ORDER.length) {
    return { ...state, phase: 'complete' }
  }
  return skipEmptyStages({ ...state, stageIndex: state.stageIndex + 1 })
}

/**
 * Moves to the next fluency round. After the transfer round, the recorded
 * rounds are replayed in a summary — unless recording was turned off.
 */
function advanceFluencyRound(state: TrainingSessionState): TrainingSessionState {
  if (state.fluency.roundIndex + 1 >= roundSecondsOf(state.plan).length) {
    if (!state.fluency.recordAll) return advanceStage(state)
    return { ...state, fluency: { ...state.fluency, stage: 'summary' } }
  }
  return {
    ...state,
    fluency: {
      ...state.fluency,
      roundIndex: state.fluency.roundIndex + 1,
      stage: 'ready',
    },
  }
}

/**
 * Leaves a running round: the first one asks for the delayed feedback before
 * round 2, the others move straight on.
 */
function completeFluencyRound(state: TrainingSessionState): TrainingSessionState {
  if (state.fluency.roundIndex === 0) {
    return { ...state, fluency: { ...state.fluency, stage: 'feedback' } }
  }
  return advanceFluencyRound(state)
}

function setQuestionStage(state: TrainingSessionState, stage: QuestionStage): TrainingSessionState {
  return { ...state, questions: { ...state.questions, stage } }
}

/** After a question cycle: the next question, then the zapping, then the next stage. */
function nextQuestion(state: TrainingSessionState): TrainingSessionState {
  if (state.questions.index + 1 < state.plan.questions.length) {
    return { ...state, questions: { index: state.questions.index + 1, stage: 'countdown' } }
  }
  const finished = { ...state, questions: { ...state.questions, index: state.plan.questions.length } }
  if ((state.plan.zappingQuestions ?? []).length > 0 && state.zapping.stage !== 'done') {
    return { ...finished, zapping: { stage: 'intro', index: 0 } }
  }
  return advanceStage(finished)
}

/** After the word gaps, the taboo monologue; then the next stage. */
function afterGaps(state: TrainingSessionState): TrainingSessionState {
  if (state.plan.taboo && state.taboo.stage === 'intro' && !state.tabooStarted) {
    return { ...state, tabooStarted: true, gaps: { ...state.gaps, index: state.plan.gapItems.length } }
  }
  return advanceStage(state)
}

export function sessionReducer(
  state: TrainingSessionState,
  action: TrainingAction,
): TrainingSessionState {
  switch (action.type) {
    case 'TIMER_SAVE': {
      const { [action.key]: _previous, ...others } = state.timers ?? {}
      void _previous
      return {
        ...state,
        timers: action.snapshot ? { ...others, [action.key]: action.snapshot } : others,
      }
    }

    case 'CHUNK_REVEAL':
      return { ...state, chunks: { ...state.chunks, step: 'revealed' } }

    case 'CHUNK_SKIP':
    case 'CHUNK_RATE': {
      const chunk = state.plan.chunks[state.chunks.index]
      if (!chunk) return state
      // A skipped chunk is not rated: its review schedule stays untouched.
      const chunkResults =
        action.type === 'CHUNK_RATE'
          ? [...state.chunkResults, { chunkId: chunk.id, result: action.result }]
          : state.chunkResults
      if (state.chunks.index + 1 < state.plan.chunks.length) {
        return {
          ...state,
          chunkResults,
          chunks: { index: state.chunks.index + 1, step: 'retrieve' },
        }
      }
      return { ...state, chunkResults, chunks: { ...state.chunks, step: 'day' } }
    }

    case 'CHUNKS_OF_DAY_CONTINUE':
      return advanceStage(state)

    case 'FLUENCY_SET_KEYWORDS':
      return {
        ...state,
        fluency: { ...state.fluency, keywords: action.keywords.slice(0, MAX_KEYWORDS) },
      }

    case 'FLUENCY_SET_RECORD_ALL':
      return { ...state, fluency: { ...state.fluency, recordAll: action.recordAll } }

    case 'FLUENCY_SUMMARY_DONE':
      return advanceStage(state)

    case 'FLUENCY_START':
      return { ...state, fluency: { ...state.fluency, stage: 'running' } }

    // Accepted only until the transfer round is reached: its subject never
    // changes under the learner's eyes, and an AI answer arriving late is dropped.
    case 'FLUENCY_SET_TRANSFER': {
      const prompt = action.prompt.trim()
      const { roundIndex, transferPrompt } = state.fluency
      if (!prompt || transferPrompt || roundIndex >= roundSecondsOf(state.plan).length - 1) {
        return state
      }
      return { ...state, fluency: { ...state.fluency, transferPrompt: prompt } }
    }

    // Rounds 2–4 first leave time to read the prompt, then the timer and the
    // recording start together.
    case 'FLUENCY_BEGIN':
      if (state.fluency.stage !== 'ready') return state
      return { ...state, fluency: { ...state.fluency, stage: 'running' } }

    case 'FLUENCY_ROUND_COMPLETE': {
      if (state.fluency.stage !== 'running') return state
      return completeFluencyRound(state)
    }

    // Skipping a running round follows the same path as finishing it; from the
    // preparation screen it just moves on to the next round.
    case 'FLUENCY_SKIP':
      return state.fluency.stage === 'running'
        ? completeFluencyRound(state)
        : advanceFluencyRound(state)

    case 'FLUENCY_SUBMIT_FEEDBACK':
      return {
        ...state,
        fluencyFeedback: {
          missingWord: action.missingWord,
          missingWordContext: action.missingWordContext,
          difficultPhrase: action.difficultPhrase,
          importantError: action.importantError,
          missedChunk: action.missedChunk ?? '',
          missedChunkIntent: action.missedChunkIntent ?? '',
        },
        fluency: { ...state.fluency, roundIndex: 1, stage: 'ready' },
      }

    case 'REPRISE_START':
      if (state.reprise.stage !== 'intro') return state
      return { ...state, reprise: { stage: 'running' } }

    // Spoken: a moment to note a missing word, never during the 3 minutes.
    case 'REPRISE_SPOKEN':
      if (state.reprise.stage !== 'running') return state
      return { ...state, reprise: { stage: 'review' } }

    case 'REPRISE_DONE':
      return advanceStage({ ...state, repriseDone: state.reprise.stage !== 'intro' })

    case 'QUESTION_COUNTDOWN_DONE':
      return setQuestionStage(state, 'prep')

    case 'QUESTION_PREP_DONE':
      return setQuestionStage(state, 'speaking')

    case 'QUESTION_SPEAKING_DONE':
      return setQuestionStage(state, 'rate')

    case 'QUESTION_RATE': {
      const question = state.plan.questions[state.questions.index]
      if (!question || state.questions.stage !== 'rate') return state
      return setQuestionStage(
        {
          ...state,
          questionRatings: [
            ...state.questionRatings.filter((entry) => entry.questionId !== question.id),
            { questionId: question.id, rating: action.rating },
          ],
        },
        'note',
      )
    }

    case 'QUESTION_NOTE_SET': {
      const question = state.plan.questions[state.questions.index]
      if (!question) return state
      return {
        ...state,
        questionNotes: { ...(state.questionNotes ?? {}), [question.id]: action.note },
      }
    }

    case 'QUESTION_WORD_SET': {
      const question = state.plan.questions[state.questions.index]
      if (!question) return state
      return {
        ...state,
        questionWords: {
          ...(state.questionWords ?? {}),
          [question.id]: { word: action.word, idea: action.idea },
        },
      }
    }

    case 'QUESTION_NOTE_DONE':
      if (state.questions.stage !== 'note') return state
      return setQuestionStage(state, 'retry')

    case 'QUESTION_RETRY_DONE':
      if (state.questions.stage !== 'retry') return state
      return nextQuestion({
        ...state,
        questionRetries: (state.questionRetries ?? 0) + 1,
      })

    // A skipped question is not rated; skipping during the zapping ends it.
    case 'QUESTION_SKIP':
      if (state.questions.index >= state.plan.questions.length) {
        return advanceStage({ ...state, zapping: { ...state.zapping, stage: 'done' } })
      }
      return nextQuestion(state)

    case 'ZAPPING_START':
      if (state.zapping.stage !== 'intro') return state
      return { ...state, zapping: { stage: 'running', index: 0 } }

    case 'ZAPPING_NEXT': {
      if (state.zapping.stage !== 'running') return state
      const next = state.zapping.index + 1
      // After the last question: a moment to note a missing word.
      if (next >= (state.plan.zappingQuestions ?? []).length) {
        return { ...state, zapping: { stage: 'review', index: next } }
      }
      return { ...state, zapping: { stage: 'running', index: next } }
    }

    case 'ZAPPING_DONE':
      return advanceStage({ ...state, zapping: { ...state.zapping, stage: 'done' } })

    case 'GAP_FOUND':
      // The learner has an answer: show it, then let them say whether it was
      // right. Nothing is recorded before that check.
      if (!state.plan.gapItems[state.gaps.index]) return state
      return { ...state, gaps: { ...state.gaps, step: 'verify' } }

    case 'GAP_VERIFY': {
      const item = state.plan.gapItems[state.gaps.index]
      if (!item || state.gaps.step !== 'verify') return state
      return {
        ...state,
        gapResults: [
          ...state.gapResults.filter((result) => result.itemKey !== item.key),
          { itemKey: item.key, found: action.correct },
        ],
        gaps: { ...state.gaps, step: 'revealed' },
      }
    }

    case 'GAP_CAPTURE': {
      const item = state.plan.gapItems[state.gaps.index]
      if (!item || item.isPersonal) return state
      const others = (state.gapCaptures ?? []).filter(
        (capture) => capture.target !== item.target,
      )
      const context = action.context.trim()
      return {
        ...state,
        gapCaptures: context ? [...others, { target: item.target, context }] : others,
      }
    }

    case 'GAP_START_PARAPHRASE':
      return { ...state, gaps: { ...state.gaps, step: 'paraphrase' } }

    case 'GAP_REVEAL': {
      const item = state.plan.gapItems[state.gaps.index]
      if (!item) return state
      const gapResults = state.gapResults.some((result) => result.itemKey === item.key)
        ? state.gapResults
        : [...state.gapResults, { itemKey: item.key, found: false }]
      return { ...state, gapResults, gaps: { ...state.gaps, step: 'revealed' } }
    }

    case 'GAP_NEXT': {
      if (state.gaps.index >= state.plan.gapItems.length) return afterGaps(state)
      const nextIndex = state.gaps.index + 1
      if (nextIndex >= state.plan.gapItems.length) return afterGaps(state)
      return {
        ...state,
        gaps: {
          index: nextIndex,
          step: initialGapStep(state.plan.gapItems[nextIndex]),
        },
      }
    }

    case 'TABOO_START':
      if (state.taboo.stage !== 'intro') return state
      return { ...state, taboo: { ...state.taboo, stage: 'running' } }

    case 'TABOO_SPOKEN':
      if (state.taboo.stage !== 'running') return state
      return { ...state, taboo: { ...state.taboo, stage: 'rate' } }

    case 'TABOO_RATE':
      if (state.taboo.stage !== 'rate') return state
      return advanceStage({ ...state, taboo: { stage: 'done', rating: action.rating } })

    case 'TABOO_SKIP':
      return advanceStage({ ...state, taboo: { ...state.taboo, stage: 'done' } })

    case 'FLUENCY_TOGGLE_REMINDER_USED': {
      const current = state.usedFluencyReminderIds ?? []
      const alreadyUsed = current.includes(action.reminderId)
      return {
        ...state,
        usedFluencyReminderIds: alreadyUsed
          ? current.filter((id) => id !== action.reminderId)
          : [...current, action.reminderId],
      }
    }

    case 'CHUNK_TOGGLE_USED': {
      const current = state.usedChunkIds ?? []
      return {
        ...state,
        usedChunkIds: current.includes(action.chunkId)
          ? current.filter((id) => id !== action.chunkId)
          : [...current, action.chunkId],
      }
    }

    case 'FEEDBACK_SET':
      return {
        ...state,
        feedback: { ...state.feedback, [action.field]: action.value },
      }

    case 'FEEDBACK_SKIP':
      return { ...state, phase: 'complete', feedbackSkipped: true }

    case 'FEEDBACK_SUBMIT':
      if (!isFeedbackValid(state.feedback)) return state
      return { ...state, phase: 'complete' }

    default:
      return state
  }
}
