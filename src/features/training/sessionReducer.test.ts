import { describe, expect, it } from 'vitest'
import { buildSessionPlan } from '../../services/review/selectPlan'
import { createInitialState } from '../../types/progress'
import {
  createSessionState,
  getCurrentStage,
  isFeedbackValid,
  prepSeconds,
  sessionReducer,
} from './sessionReducer'
import { prepSecondsForLevel } from './types'
import type { TrainingSessionState } from './types'

const plan = buildSessionPlan(createInitialState(), () => 0.5)

function newSession(): TrainingSessionState {
  return createSessionState(plan, 2, new Date('2026-10-02T10:00:00.000Z'))
}

describe('createSessionState', () => {
  it('starts on chunks with reusable-learning fields initialized', () => {
    const state = newSession()
    expect(getCurrentStage(state)).toBe('chunks')
    expect(state.fluency.keywords).toEqual([])
    expect(state.fluencyFeedback.missingWordContext).toBe('')
    expect(state.plan.questions).toHaveLength(5)
  })
})

describe('prep time adaptation', () => {
  it('adjusts preparation seconds to the level', () => {
    expect(prepSecondsForLevel(1)).toBe(10)
    expect(prepSecondsForLevel(2)).toBe(5)
    expect(prepSecondsForLevel(3)).toBe(3)
  })

  it('reads prep seconds from the session level', () => {
    expect(prepSeconds(newSession())).toBe(5)
  })
})

describe('full session walk', () => {
  it('moves through chunks, fluency, questions, gaps and feedback', () => {
    let state = newSession()

    for (const result of ['easy', 'difficult', 'failed'] as const) {
      state = sessionReducer(state, { type: 'CHUNK_REVEAL' })
      state = sessionReducer(state, { type: 'CHUNK_RATE', result })
    }
    state = sessionReducer(state, { type: 'CHUNKS_OF_DAY_CONTINUE' })
    expect(getCurrentStage(state)).toBe('fluency')

    state = sessionReducer(state, {
      type: 'FLUENCY_SET_KEYWORDS',
      keywords: ['travail', 'transport', 'temps'],
    })
    expect(state.fluency.keywords).toEqual(['travail', 'transport', 'temps'])

    state = sessionReducer(state, { type: 'FLUENCY_START' })
    state = sessionReducer(state, { type: 'FLUENCY_ROUND_COMPLETE' })
    expect(state.fluency.stage).toBe('feedback')

    state = sessionReducer(state, {
      type: 'FLUENCY_SUBMIT_FEEDBACK',
      missingWord: 'prise électrique',
      missingWordContext: 'l’endroit dans le mur où je branche un appareil',
      difficultPhrase: 'Je ne savais pas comment conclure',
      importantError: 'Attention à depuis',
    })
    expect(state.fluency.roundIndex).toBe(1)
    expect(state.fluency.keywords).toHaveLength(3)

    for (let i = 0; i < 3; i += 1) {
      state = sessionReducer(state, { type: 'FLUENCY_ROUND_COMPLETE' })
    }
    expect(getCurrentStage(state)).toBe('questions')

    for (let i = 0; i < 4; i += 1) {
      state = sessionReducer(state, { type: 'QUESTION_COUNTDOWN_DONE' })
      state = sessionReducer(state, { type: 'QUESTION_PREP_DONE' })
      state = sessionReducer(state, { type: 'QUESTION_SPEAKING_DONE' })
      state = sessionReducer(state, { type: 'QUESTION_RATE', rating: 'none' })
    }
    state = sessionReducer(state, { type: 'QUESTION_COUNTDOWN_DONE' })
    state = sessionReducer(state, { type: 'QUESTION_PREP_DONE' })
    state = sessionReducer(state, { type: 'QUESTION_SPEAKING_DONE' })
    state = sessionReducer(state, { type: 'QUESTION_RATE', rating: 'much' })

    expect(state.revenge.questionId).not.toBeNull()
    state = sessionReducer(state, { type: 'REVENGE_COUNTDOWN_DONE' })
    state = sessionReducer(state, { type: 'REVENGE_PREP_DONE' })
    state = sessionReducer(state, { type: 'REVENGE_DONE' })
    expect(getCurrentStage(state)).toBe('gaps')

    for (let i = 0; i < 5; i += 1) {
      if (state.gaps.step === 'recall') {
        state = sessionReducer(state, { type: 'GAP_FOUND' })
      } else {
        state = sessionReducer(state, { type: 'GAP_REVEAL' })
      }
      state = sessionReducer(state, { type: 'GAP_NEXT' })
    }
    expect(getCurrentStage(state)).toBe('feedback')

    state = sessionReducer(state, {
      type: 'FEEDBACK_SET',
      field: 'blockCount',
      value: 2,
    })
    state = sessionReducer(state, {
      type: 'FEEDBACK_SET',
      field: 'fluencyScore',
      value: 4,
    })
    state = sessionReducer(state, { type: 'FEEDBACK_SUBMIT' })
    expect(state.phase).toBe('complete')
  })
})

describe('question revenge selection', () => {
  it('skips revenge when nothing was blocked', () => {
    let state = { ...newSession(), stageIndex: 2 }
    for (let i = 0; i < 5; i += 1) {
      state = sessionReducer(state, { type: 'QUESTION_RATE', rating: 'none' })
    }
    expect(state.revenge.questionId).toBeNull()
    expect(getCurrentStage(state)).toBe('gaps')
  })

  it('attributes the advanced final rating to the pivot question', () => {
    const base = createSessionState(plan, 3, new Date('2026-10-02T10:00:00.000Z'))
    let state: TrainingSessionState = {
      ...base,
      stageIndex: 2,
      questions: {
        index: plan.questions.length - 1,
        stage: 'rate',
      },
      questionRatings: plan.questions.slice(0, -1).map((question) => ({
        questionId: question.id,
        rating: 'none' as const,
      })),
    }

    state = sessionReducer(state, { type: 'QUESTION_RATE', rating: 'much' })

    expect(state.questionRatings.at(-1)?.questionId).toBe(plan.pivotQuestion?.id)
    expect(state.revenge.questionId).toBe(plan.pivotQuestion?.id)
  })
})

describe('active reuse confirmation', () => {
  it('tracks only reminders the learner confirms having used', () => {
    let state = newSession() as TrainingSessionState & {
      usedFluencyReminderIds?: string[]
    }

    state = sessionReducer(
      state,
      { type: 'FLUENCY_TOGGLE_REMINDER_USED', reminderId: 'note-1' } as any,
    ) as typeof state

    expect(state.usedFluencyReminderIds).toEqual(['note-1'])

    state = sessionReducer(
      state,
      { type: 'FLUENCY_TOGGLE_REMINDER_USED', reminderId: 'note-1' } as any,
    ) as typeof state

    expect(state.usedFluencyReminderIds).toEqual([])
  })
})

describe('feedback validation', () => {
  const valid = {
    blockedWord: '',
    blockedWordContext: '',
    abandonedSentence: '',
    awkwardPhrase: '',
    expressionToReuse: '',
    expressionIntent: '',
    blockCount: 0,
    fluencyScore: 3,
  }

  it('requires metrics and context for learning material', () => {
    expect(isFeedbackValid(valid)).toBe(true)
    expect(
      isFeedbackValid({ ...valid, blockedWord: 'prise', blockedWordContext: '' }),
    ).toBe(false)
    expect(
      isFeedbackValid({
        ...valid,
        expressionToReuse: 'En revanche…',
        expressionIntent: '',
      }),
    ).toBe(false)
    expect(isFeedbackValid({ ...valid, blockCount: -1 })).toBe(false)
  })
})
