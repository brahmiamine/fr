import type {
  ContentRepository,
  SessionContent,
} from '../../types/content'
import {
  EXERCISE_ORDER,
  FLUENCY_ROUND_SECONDS,
  NATURAL_EXAMPLES_PER_EXPRESSION,
  PARAPHRASE_SECONDS,
  QUESTION_SPEAKING_SECONDS,
} from './types'
import type {
  ExerciseKind,
  PersistedSessionContent,
  ReviewDraft,
  SessionReflection,
  TrainingSessionState,
} from './types'

export type TrainingAction =
  | { type: 'FLUENCY_ROUND_COMPLETE' }
  | {
      type: 'SUBMIT_REFLECTION'
      missingWord: string
      difficultPhrase: string
      importantError: string
    }
  | { type: 'PARAPHRASE_NEXT' }
  | { type: 'PARAPHRASE_FINISH' }
  | { type: 'QUESTION_COUNTDOWN_DONE' }
  | { type: 'QUESTION_NEXT' }
  | { type: 'QUESTIONS_FINISH' }
  | {
      type: 'SET_EXAMPLE'
      expressionId: string
      index: number
      value: string
    }
  | { type: 'NATURAL_NEXT' }
  | {
      type: 'UPDATE_REVIEW'
      field: keyof ReviewDraft
      value: string | number | null
    }
  | { type: 'SUBMIT_REVIEW' }

export function toPersistedContent(content: SessionContent): PersistedSessionContent {
  return {
    topicId: content.topic.id,
    wordIds: content.paraphraseWords.map((word) => word.id),
    questionIds: content.questions.map((question) => question.id),
    expressionIds: content.expressions.map((expression) => expression.id),
  }
}

export function createSessionId(now: Date = new Date()): string {
  return `s-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`
}

function emptyExamples(content: PersistedSessionContent): Record<string, string[]> {
  const examples: Record<string, string[]> = {}
  for (const id of content.expressionIds) {
    examples[id] = Array.from(
      { length: NATURAL_EXAMPLES_PER_EXPRESSION },
      () => '',
    )
  }
  return examples
}

export function createSessionState(
  content: SessionContent,
  now: Date = new Date(),
): TrainingSessionState {
  const persisted = toPersistedContent(content)
  return {
    sessionId: createSessionId(now),
    startedAt: now.toISOString(),
    content: persisted,
    exerciseIndex: 0,
    phase: 'exercise',
    fluency: { roundIndex: 0, stage: 'running' },
    paraphrase: { index: 0 },
    questions: { index: 0, stage: 'countdown' },
    natural: { index: 0 },
    examples: emptyExamples(persisted),
    reflection: { missingWord: '', difficultPhrase: '', importantError: '' },
    review: {
      blockCount: null,
      successParaphrase: '',
      expressionToReuse: '',
      errorToWatch: '',
      fluencyScore: null,
    },
  }
}

export function getCurrentExercise(
  state: TrainingSessionState,
): ExerciseKind | null {
  if (state.phase !== 'exercise') return null
  return EXERCISE_ORDER[state.exerciseIndex] ?? null
}

export function isReviewValid(review: ReviewDraft): boolean {
  const blocksValid =
    review.blockCount !== null &&
    Number.isFinite(review.blockCount) &&
    review.blockCount >= 0
  const scoreValid =
    review.fluencyScore !== null &&
    Number.isInteger(review.fluencyScore) &&
    review.fluencyScore >= 1 &&
    review.fluencyScore <= 5
  return blocksValid && scoreValid
}

function advanceExercise(state: TrainingSessionState): TrainingSessionState {
  if (state.exerciseIndex + 1 >= EXERCISE_ORDER.length) {
    return { ...state, phase: 'review' }
  }
  return { ...state, exerciseIndex: state.exerciseIndex + 1 }
}

export function sessionReducer(
  state: TrainingSessionState,
  action: TrainingAction,
): TrainingSessionState {
  switch (action.type) {
    case 'FLUENCY_ROUND_COMPLETE': {
      if (state.phase !== 'exercise') return state
      if (getCurrentExercise(state) !== 'fluency432') return state

      if (state.fluency.roundIndex === 0 && state.fluency.stage === 'running') {
        return { ...state, fluency: { ...state.fluency, stage: 'reflection' } }
      }

      const isLastRound =
        state.fluency.roundIndex >= FLUENCY_ROUND_SECONDS.length - 1
      if (isLastRound) return advanceExercise(state)

      return {
        ...state,
        fluency: { roundIndex: state.fluency.roundIndex + 1, stage: 'running' },
      }
    }

    case 'SUBMIT_REFLECTION': {
      const reflection: SessionReflection = {
        missingWord: action.missingWord,
        difficultPhrase: action.difficultPhrase,
        importantError: action.importantError,
      }
      return {
        ...state,
        reflection,
        fluency: { roundIndex: 1, stage: 'running' },
      }
    }

    case 'PARAPHRASE_NEXT': {
      if (getCurrentExercise(state) !== 'paraphrase') return state
      if (state.paraphrase.index + 1 >= state.content.wordIds.length) {
        return advanceExercise(state)
      }
      return {
        ...state,
        paraphrase: { index: state.paraphrase.index + 1 },
      }
    }

    case 'PARAPHRASE_FINISH': {
      if (getCurrentExercise(state) !== 'paraphrase') return state
      return advanceExercise(state)
    }

    case 'QUESTION_COUNTDOWN_DONE': {
      if (getCurrentExercise(state) !== 'questions') return state
      return { ...state, questions: { ...state.questions, stage: 'speaking' } }
    }

    case 'QUESTION_NEXT': {
      if (getCurrentExercise(state) !== 'questions') return state
      if (state.questions.index + 1 >= state.content.questionIds.length) {
        return advanceExercise(state)
      }
      return {
        ...state,
        questions: { index: state.questions.index + 1, stage: 'countdown' },
      }
    }

    case 'QUESTIONS_FINISH': {
      if (getCurrentExercise(state) !== 'questions') return state
      return advanceExercise(state)
    }

    case 'SET_EXAMPLE': {
      const current = state.examples[action.expressionId] ?? []
      const next = [...current]
      next[action.index] = action.value
      return {
        ...state,
        examples: { ...state.examples, [action.expressionId]: next },
      }
    }

    case 'NATURAL_NEXT': {
      if (getCurrentExercise(state) !== 'natural') return state
      if (state.natural.index + 1 >= state.content.expressionIds.length) {
        return advanceExercise(state)
      }
      return { ...state, natural: { index: state.natural.index + 1 } }
    }

    case 'UPDATE_REVIEW': {
      return {
        ...state,
        review: { ...state.review, [action.field]: action.value },
      }
    }

    case 'SUBMIT_REVIEW': {
      if (!isReviewValid(state.review)) return state
      return { ...state, phase: 'complete' }
    }

    default:
      return state
  }
}

/** Seconds allocated to the active step, used to drive the current timer. */
export function currentStepSeconds(state: TrainingSessionState): number | null {
  const exercise = getCurrentExercise(state)
  if (!exercise) return null
  if (exercise === 'fluency432') {
    if (state.fluency.stage !== 'running') return null
    return FLUENCY_ROUND_SECONDS[state.fluency.roundIndex] ?? null
  }
  if (exercise === 'paraphrase') return PARAPHRASE_SECONDS
  if (exercise === 'questions') {
    return state.questions.stage === 'speaking'
      ? QUESTION_SPEAKING_SECONDS
      : null
  }
  return null
}

export function resolveContent(
  persisted: PersistedSessionContent,
  repository: ContentRepository,
): SessionContent | null {
  const topic = repository.topics.find((item) => item.id === persisted.topicId)
  if (!topic) return null

  const mapById = <T extends { id: string }>(
    ids: readonly string[],
    items: readonly T[],
  ): T[] =>
    ids
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is T => Boolean(item))

  return {
    topic,
    paraphraseWords: mapById(persisted.wordIds, repository.paraphraseWords),
    questions: mapById(persisted.questionIds, repository.questions),
    expressions: mapById(persisted.expressionIds, repository.nativeExpressions),
  }
}
