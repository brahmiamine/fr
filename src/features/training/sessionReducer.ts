import type {
  BlockRating,
  GapItem,
  RecallResult,
  SessionPlan,
  TrainingSessionState,
} from './types'
import { STAGE_ORDER, TRAINING_SESSION_SCHEMA, prepSecondsForLevel } from './types'
import type { SessionFeedback } from './types'
import type { TimerSnapshot } from '../../hooks/useCountdownTimer'

export type TrainingAction =
  | { type: 'CHUNK_REVEAL' }
  | { type: 'CHUNK_RATE'; result: RecallResult }
  | { type: 'CHUNKS_OF_DAY_CONTINUE' }
  | { type: 'FLUENCY_SET_KEYWORDS'; keywords: string[] }
  | { type: 'FLUENCY_START' }
  | { type: 'FLUENCY_ROUND_COMPLETE' }
  | {
      type: 'FLUENCY_SUBMIT_FEEDBACK'
      missingWord: string
      missingWordContext: string
      difficultPhrase: string
      importantError: string
      missedChunk?: string
      missedChunkIntent?: string
    }
  | { type: 'QUESTION_COUNTDOWN_DONE' }
  | { type: 'QUESTION_PREP_DONE' }
  | { type: 'QUESTION_SPEAKING_DONE' }
  | { type: 'QUESTION_RATE'; rating: BlockRating }
  | { type: 'QUESTION_SKIP' }
  | { type: 'REVENGE_COUNTDOWN_DONE' }
  | { type: 'REVENGE_PREP_DONE' }
  | { type: 'REVENGE_DONE' }
  | { type: 'GAP_FOUND' }
  | { type: 'GAP_VERIFY'; correct: boolean }
  | { type: 'GAP_CAPTURE'; context: string }
  | { type: 'GAP_START_PARAPHRASE' }
  | { type: 'GAP_REVEAL' }
  | { type: 'GAP_NEXT' }
  | { type: 'FLUENCY_TOGGLE_REMINDER_USED'; reminderId: string }
  | { type: 'CHUNK_TOGGLE_USED'; chunkId: string }
  | {
      type: 'FEEDBACK_SET'
      field: keyof SessionFeedback
      value: string | number | null
    }
  | { type: 'FEEDBACK_SUBMIT' }
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
  return {
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
    fluency: { roundIndex: 0, stage: 'prep', keywords: [] },
    fluencyFeedback: {
      missingWord: '',
      missingWordContext: '',
      difficultPhrase: '',
      importantError: '',
      missedChunk: '',
      missedChunkIntent: '',
    },
    questions: { index: 0, stage: 'countdown' },
    questionRatings: [],
    revenge: { questionId: null, stage: 'idle' },
    gaps: { index: 0, step: initialGapStep(plan.gapItems[0]) },
    gapResults: [],
    gapCaptures: [],
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
}

export function getCurrentStage(
  state: TrainingSessionState,
): (typeof STAGE_ORDER)[number] {
  return STAGE_ORDER[state.stageIndex] ?? 'feedback'
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

function advanceStage(state: TrainingSessionState): TrainingSessionState {
  if (state.stageIndex + 1 >= STAGE_ORDER.length) {
    return { ...state, phase: 'complete' }
  }
  return { ...state, stageIndex: state.stageIndex + 1 }
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

    case 'CHUNK_RATE': {
      const chunk = state.plan.chunks[state.chunks.index]
      if (!chunk) return state
      const chunkResults = [
        ...state.chunkResults,
        { chunkId: chunk.id, result: action.result },
      ]
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
        fluency: { ...state.fluency, keywords: action.keywords.slice(0, 3) },
      }

    case 'FLUENCY_START':
      return { ...state, fluency: { ...state.fluency, stage: 'running' } }

    case 'FLUENCY_ROUND_COMPLETE': {
      if (state.fluency.stage !== 'running') return state
      if (state.fluency.roundIndex === 0) {
        return { ...state, fluency: { ...state.fluency, stage: 'feedback' } }
      }
      if (state.fluency.roundIndex < 3) {
        return {
          ...state,
          fluency: {
            ...state.fluency,
            roundIndex: state.fluency.roundIndex + 1,
            stage: 'running',
          },
        }
      }
      return advanceStage(state)
    }

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
        fluency: { ...state.fluency, roundIndex: 1, stage: 'running' },
      }

    case 'QUESTION_COUNTDOWN_DONE':
      return { ...state, questions: { ...state.questions, stage: 'prep' } }

    case 'QUESTION_PREP_DONE':
      return { ...state, questions: { ...state.questions, stage: 'speaking' } }

    case 'QUESTION_SPEAKING_DONE':
      return { ...state, questions: { ...state.questions, stage: 'rate' } }

    case 'QUESTION_SKIP':
    case 'QUESTION_RATE': {
      const question = state.plan.questions[state.questions.index]
      if (!question) return state
      // The rating always belongs to the question that was asked, even when an
      // advanced pivot followed it, so it can be chosen for the revenge.
      // A skipped question is not rated.
      const questionRatings =
        action.type === 'QUESTION_RATE'
          ? [...state.questionRatings, { questionId: question.id, rating: action.rating }]
          : state.questionRatings

      if (state.questions.index + 1 < state.plan.questions.length) {
        return {
          ...state,
          questionRatings,
          questions: { index: state.questions.index + 1, stage: 'countdown' },
        }
      }

      // "Reprends celle où tu as le plus bloqué": the revenge always happens,
      // on the worst-rated question (the first one on a tie).
      const rank: Record<BlockRating, number> = { none: 0, some: 1, much: 2 }
      let worstId: string | null = null
      let worstRank = -1
      for (const entry of questionRatings) {
        if (rank[entry.rating] > worstRank) {
          worstRank = rank[entry.rating]
          worstId = entry.questionId
        }
      }

      if (worstId) {
        return {
          ...state,
          questionRatings,
          revenge: { questionId: worstId, stage: 'countdown' },
        }
      }
      return advanceStage({ ...state, questionRatings })
    }

    case 'REVENGE_COUNTDOWN_DONE':
      return { ...state, revenge: { ...state.revenge, stage: 'prep' } }

    case 'REVENGE_PREP_DONE':
      return { ...state, revenge: { ...state.revenge, stage: 'speaking' } }

    case 'REVENGE_DONE':
      return advanceStage({
        ...state,
        revenge: { ...state.revenge, stage: 'done' },
      })

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
      const nextIndex = state.gaps.index + 1
      if (nextIndex >= state.plan.gapItems.length) return advanceStage(state)
      return {
        ...state,
        gaps: {
          index: nextIndex,
          step: initialGapStep(state.plan.gapItems[nextIndex]),
        },
      }
    }

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

    case 'FEEDBACK_SUBMIT':
      if (!isFeedbackValid(state.feedback)) return state
      return { ...state, phase: 'complete' }

    default:
      return state
  }
}
