import { describe, expect, it } from 'vitest'
import { contentRepository } from '../../services/content/contentRepository'
import { buildSessionContent } from '../../services/content/selectContent'
import type { SessionContent } from '../../types/content'
import {
  createSessionState,
  getCurrentExercise,
  isReviewValid,
  resolveContent,
  sessionReducer,
} from './sessionReducer'
import { FLUENCY_ROUND_SECONDS } from './types'
import type { TrainingSessionState } from './types'

const content: SessionContent = buildSessionContent(
  contentRepository,
  { topicIds: [], questionIds: [], wordIds: [], expressionIds: [] },
  () => 0.5,
)

function newSession(): TrainingSessionState {
  return createSessionState(content, new Date('2026-10-02T10:00:00.000Z'))
}

function atExercise(index: number): TrainingSessionState {
  return { ...newSession(), exerciseIndex: index }
}

describe('createSessionState', () => {
  it('starts on the first exercise with empty examples', () => {
    const state = newSession()
    expect(state.phase).toBe('exercise')
    expect(getCurrentExercise(state)).toBe('fluency432')
    for (const expression of content.expressions) {
      expect(state.examples[expression.id]).toEqual(['', '', ''])
    }
  })
})

describe('fluency 4 → 3 → 2', () => {
  it('goes through reflection then each round and advances', () => {
    let state = newSession()

    state = sessionReducer(state, { type: 'FLUENCY_ROUND_COMPLETE' })
    expect(state.fluency).toEqual({ roundIndex: 0, stage: 'reflection' })

    state = sessionReducer(state, {
      type: 'SUBMIT_REFLECTION',
      missingWord: 'mot',
      difficultPhrase: 'phrase',
      importantError: 'erreur',
    })
    expect(state.fluency).toEqual({ roundIndex: 1, stage: 'running' })
    expect(state.reflection.missingWord).toBe('mot')

    // Finish rounds 2, 3, then the transfer round.
    for (
      let round = 1;
      round < FLUENCY_ROUND_SECONDS.length;
      round += 1
    ) {
      state = sessionReducer(state, { type: 'FLUENCY_ROUND_COMPLETE' })
    }
    expect(state.exerciseIndex).toBe(1)
    expect(getCurrentExercise(state)).toBe('paraphrase')
  })
})

describe('paraphrase', () => {
  it('advances through every word then moves on', () => {
    let state = atExercise(1)
    for (let i = 0; i < content.paraphraseWords.length; i += 1) {
      state = sessionReducer(state, { type: 'PARAPHRASE_NEXT' })
    }
    expect(getCurrentExercise(state)).toBe('questions')
  })

  it('can finish early', () => {
    const state = sessionReducer(atExercise(1), { type: 'PARAPHRASE_FINISH' })
    expect(getCurrentExercise(state)).toBe('questions')
  })
})

describe('surprise questions', () => {
  it('reveals the question then advances', () => {
    let state = atExercise(2)
    state = sessionReducer(state, { type: 'QUESTION_COUNTDOWN_DONE' })
    expect(state.questions.stage).toBe('speaking')

    for (let i = 0; i < content.questions.length; i += 1) {
      state = sessionReducer(state, { type: 'QUESTION_NEXT' })
    }
    expect(getCurrentExercise(state)).toBe('natural')
  })
})

describe('natural french', () => {
  it('stores examples and moves to review', () => {
    let state = atExercise(3)
    state = sessionReducer(state, {
      type: 'SET_EXAMPLE',
      expressionId: content.expressions[0].id,
      index: 1,
      value: 'Ma phrase',
    })
    expect(state.examples[content.expressions[0].id][1]).toBe('Ma phrase')

    for (let i = 0; i < content.expressions.length; i += 1) {
      state = sessionReducer(state, { type: 'NATURAL_NEXT' })
    }
    expect(state.phase).toBe('review')
  })
})

describe('review', () => {
  it('rejects invalid reviews and accepts a valid one', () => {
    let state: TrainingSessionState = { ...newSession(), phase: 'review' }

    expect(isReviewValid(state.review)).toBe(false)
    state = sessionReducer(state, { type: 'SUBMIT_REVIEW' })
    expect(state.phase).toBe('review')

    state = sessionReducer(state, {
      type: 'UPDATE_REVIEW',
      field: 'blockCount',
      value: 3,
    })
    state = sessionReducer(state, {
      type: 'UPDATE_REVIEW',
      field: 'fluencyScore',
      value: 4,
    })
    expect(isReviewValid(state.review)).toBe(true)

    state = sessionReducer(state, { type: 'SUBMIT_REVIEW' })
    expect(state.phase).toBe('complete')
  })

  it('validates score boundaries', () => {
    expect(
      isReviewValid({ blockCount: 0, successParaphrase: '', expressionToReuse: '', errorToWatch: '', fluencyScore: 0 }),
    ).toBe(false)
    expect(
      isReviewValid({ blockCount: 0, successParaphrase: '', expressionToReuse: '', errorToWatch: '', fluencyScore: 6 }),
    ).toBe(false)
    expect(
      isReviewValid({ blockCount: -1, successParaphrase: '', expressionToReuse: '', errorToWatch: '', fluencyScore: 3 }),
    ).toBe(false)
  })
})

describe('resolveContent', () => {
  it('maps persisted ids back to content objects', () => {
    const persisted = newSession().content
    const resolved = resolveContent(persisted, contentRepository)
    expect(resolved?.topic.id).toBe(persisted.topicId)
    expect(resolved?.questions).toHaveLength(persisted.questionIds.length)
  })

  it('returns null when the topic is unknown', () => {
    const persisted = { ...newSession().content, topicId: 'unknown' }
    expect(resolveContent(persisted, contentRepository)).toBeNull()
  })
})
