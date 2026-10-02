import type {
  BlockRating,
  GapItem,
  RecallResult,
  SessionPlan,
  TrainingSessionState,
} from './types'
import { STAGE_ORDER, prepSecondsForLevel } from './types'
import type { SessionFeedback } from './types'

export type TrainingAction =
  | { type: 'CHUNK_REVEAL' }
  | { type: 'CHUNK_RATE'; result: RecallResult }
  | { type: 'CHUNKS_OF_DAY_CONTINUE' }
  | { type: 'FLUENCY_START' }
  | { type: 'FLUENCY_ROUND_COMPLETE' }
  | {
      type: 'FLUENCY_SUBMIT_FEEDBACK'
      missingWord: string
      difficultPhrase: string
      importantError: string
    }
  | { type: 'QUESTION_COUNTDOWN_DONE' }
  | { type: 'QUESTION_PREP_DONE' }
  | { type: 'QUESTION_SPEAKING_DONE' }
  | { type: 'QUESTION_RATE'; rating: BlockRating }
  | { type: 'REVENGE_COUNTDOWN_DONE' }
  | { type: 'REVENGE_PREP_DONE' }
  | { type: 'REVENGE_DONE' }
  | { type: 'GAP_FOUND' }
  | { type: 'GAP_START_PARAPHRASE' }
  | { type: 'GAP_REVEAL' }
  | { type: 'GAP_NEXT' }
  | {
      type: 'FEEDBACK_SET'
      field: keyof SessionFeedback
      value: string | number | null
    }
  | { type: 'FEEDBACK_SUBMIT' }

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
    sessionId: createSessionId(now),
    startedAt: now.toISOString(),
    level,
    stageIndex: 0,
    phase: 'active',
    plan,
    chunks: { index: 0, step: 'retrieve' },
    chunkResults: [],
    chunksOfDayShown: false,
    fluency: { roundIndex: 0, stage: 'prep' },
    fluencyFeedback: { missingWord: '', difficultPhrase: '', importantError: '' },
    questions: { index: 0, stage: 'countdown' },
    questionRatings: [],
    revenge: { questionId: null, stage: 'idle' },
    gaps: { index: 0, step: initialGapStep(plan.gapItems[0]) },
    gapResults: [],
    feedback: {
      blockedWord: '',
      expressionToReuse: '',
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
  return blocksValid && scoreValid
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
    case 'CHUNK_REVEAL':
      return { ...state, chunks: { ...state.chunks, step: 'revealed' } }

    case 'CHUNK_RATE': {
      const chunk = state.plan.chunks[state.chunks.index]
      if (!chunk) return state
      const result = { chunkId: chunk.id, result: action.result }
      const chunkResults = [...state.chunkResults, result]

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
          difficultPhrase: action.difficultPhrase,
          importantError: action.importantError,
        },
        fluency: { roundIndex: 1, stage: 'running' },
      }

    case 'QUESTION_COUNTDOWN_DONE':
      return { ...state, questions: { ...state.questions, stage: 'prep' } }

    case 'QUESTION_PREP_DONE':
      return { ...state, questions: { ...state.questions, stage: 'speaking' } }

    case 'QUESTION_SPEAKING_DONE':
      return { ...state, questions: { ...state.questions, stage: 'rate' } }

    case 'QUESTION_RATE': {
      const question = state.plan.questions[state.questions.index]
      if (!question) return state
      const questionRatings = [
        ...state.questionRatings,
        { questionId: question.id, rating: action.rating },
      ]

      if (state.questions.index + 1 < state.plan.questions.length) {
        return {
          ...state,
          questionRatings,
          questions: { index: state.questions.index + 1, stage: 'countdown' },
        }
      }

      const rank: Record<BlockRating, number> = { none: 0, some: 1, much: 2 }
      let worstId: string | null = null
      let worstRank = 0
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
      return advanceStage({ ...state, revenge: { ...state.revenge, stage: 'done' } })

    case 'GAP_FOUND': {
      const item = state.plan.gapItems[state.gaps.index]
      if (!item) return state
      return {
        ...state,
        gapResults: [...state.gapResults, { itemKey: item.key, found: true }],
        gaps: { ...state.gaps, step: 'revealed' },
      }
    }

    case 'GAP_START_PARAPHRASE':
      return { ...state, gaps: { ...state.gaps, step: 'paraphrase' } }

    case 'GAP_REVEAL': {
      const item = state.plan.gapItems[state.gaps.index]
      if (!item) return state
      const gapResults = state.gapResults.some((r) => r.itemKey === item.key)
        ? state.gapResults
        : [...state.gapResults, { itemKey: item.key, found: false }]
      return { ...state, gapResults, gaps: { ...state.gaps, step: 'revealed' } }
    }

    case 'GAP_NEXT': {
      const nextIndex = state.gaps.index + 1
      if (nextIndex >= state.plan.gapItems.length) {
        return advanceStage(state)
      }
      return {
        ...state,
        gaps: {
          index: nextIndex,
          step: initialGapStep(state.plan.gapItems[nextIndex]),
        },
      }
    }

    case 'FEEDBACK_SET':
      return {
        ...state,
        feedback: { ...state.feedback, [action.field]: action.value },
      }

    case 'FEEDBACK_SUBMIT': {
      if (!isFeedbackValid(state.feedback)) return state
      return { ...state, phase: 'complete' }
    }

    default:
      return state
  }
}
