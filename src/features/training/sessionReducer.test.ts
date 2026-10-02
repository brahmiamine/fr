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
  it('starts on the chunks stage with a full plan', () => {
    const state = newSession()
    expect(getCurrentStage(state)).toBe('chunks')
    expect(state.phase).toBe('active')
    expect(state.chunks.step).toBe('retrieve')
    expect(state.plan.gapItems).toHaveLength(5)
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
  it('moves through chunks, fluency, questions, gaps and feedback to completion', () => {
    let state = newSession()

    // --- chunks: reveal/rate each chunk, then the chunks-of-day screen
    for (const result of ['easy', 'difficult', 'failed'] as const) {
      state = sessionReducer(state, { type: 'CHUNK_REVEAL' })
      expect(state.chunks.step).toBe('revealed')
      state = sessionReducer(state, { type: 'CHUNK_RATE', result })
    }
    expect(state.chunks.step).toBe('day')
    expect(state.chunkResults).toHaveLength(3)
    state = sessionReducer(state, { type: 'CHUNKS_OF_DAY_CONTINUE' })
    expect(getCurrentStage(state)).toBe('fluency')

    // --- fluency: prep -> running -> feedback -> 3 rounds -> transfer
    expect(state.fluency.stage).toBe('prep')
    state = sessionReducer(state, { type: 'FLUENCY_START' })
    state = sessionReducer(state, { type: 'FLUENCY_ROUND_COMPLETE' })
    expect(state.fluency.stage).toBe('feedback')

    state = sessionReducer(state, {
      type: 'FLUENCY_SUBMIT_FEEDBACK',
      missingWord: 'prise électrique',
      difficultPhrase: '',
      importantError: '',
    })
    expect(state.fluency.roundIndex).toBe(1)
    expect(state.fluencyFeedback.missingWord).toBe('prise électrique')

    for (let i = 0; i < 3; i += 1) {
      state = sessionReducer(state, { type: 'FLUENCY_ROUND_COMPLETE' })
    }
    expect(getCurrentStage(state)).toBe('questions')

    // --- questions: countdown/prep/speaking/rate, then revenge
    for (let i = 0; i < 4; i += 1) {
      state = sessionReducer(state, { type: 'QUESTION_COUNTDOWN_DONE' })
      state = sessionReducer(state, { type: 'QUESTION_PREP_DONE' })
      state = sessionReducer(state, { type: 'QUESTION_SPEAKING_DONE' })
      state = sessionReducer(state, { type: 'QUESTION_RATE', rating: 'none' })
    }
    // Last question rated "much" -> triggers the revenge round.
    state = sessionReducer(state, { type: 'QUESTION_COUNTDOWN_DONE' })
    state = sessionReducer(state, { type: 'QUESTION_PREP_DONE' })
    state = sessionReducer(state, { type: 'QUESTION_SPEAKING_DONE' })
    state = sessionReducer(state, { type: 'QUESTION_RATE', rating: 'much' })

    expect(state.revenge.questionId).not.toBeNull()
    expect(state.revenge.stage).toBe('countdown')
    state = sessionReducer(state, { type: 'REVENGE_COUNTDOWN_DONE' })
    state = sessionReducer(state, { type: 'REVENGE_PREP_DONE' })
    state = sessionReducer(state, { type: 'REVENGE_DONE' })
    expect(getCurrentStage(state)).toBe('gaps')

    // --- gaps: generic words start at paraphrase, reveal, then next
    for (let i = 0; i < 5; i += 1) {
      expect(state.gaps.step).toBe('paraphrase')
      state = sessionReducer(state, { type: 'GAP_REVEAL' })
      expect(state.gaps.step).toBe('revealed')
      state = sessionReducer(state, { type: 'GAP_NEXT' })
    }
    expect(getCurrentStage(state)).toBe('feedback')

    // --- feedback
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
    let state = newSession()
    state = { ...state, stageIndex: 2 }
    for (let i = 0; i < 5; i += 1) {
      state = sessionReducer(state, { type: 'QUESTION_RATE', rating: 'none' })
    }
    expect(state.revenge.questionId).toBeNull()
    expect(getCurrentStage(state)).toBe('gaps')
  })
})

describe('gap retrieval flow', () => {
  it('records a found word and a missed word', () => {
    const state = newSession()
    const withGap = {
      ...state,
      stageIndex: 3,
      plan: {
        ...state.plan,
        gapItems: [
          {
            key: 'gap-x',
            kind: 'retrieve' as const,
            target: 'prise électrique',
            context: 'où on branche un appareil',
            isPersonal: true,
            sourceId: 'gap-1',
          },
        ],
      },
      gaps: { index: 0, step: 'recall' as const },
    }

    const found = sessionReducer(withGap, { type: 'GAP_FOUND' })
    expect(found.gapResults[0]).toEqual({ itemKey: 'gap-x', found: true })
    expect(found.gaps.step).toBe('revealed')

    const missed = sessionReducer(withGap, { type: 'GAP_START_PARAPHRASE' })
    expect(missed.gaps.step).toBe('paraphrase')
    const revealed = sessionReducer(missed, { type: 'GAP_REVEAL' })
    expect(revealed.gapResults[0]).toEqual({ itemKey: 'gap-x', found: false })
  })
})

describe('feedback validation', () => {
  it('accepts only nonnegative blocks and a 1–5 score', () => {
    const valid = {
      blockedWord: '',
      expressionToReuse: '',
      blockCount: 0,
      fluencyScore: 3,
    }
    expect(isFeedbackValid(valid)).toBe(true)
    expect(isFeedbackValid({ ...valid, blockCount: -1 })).toBe(false)
    expect(isFeedbackValid({ ...valid, fluencyScore: 0 })).toBe(false)
    expect(isFeedbackValid({ ...valid, fluencyScore: 6 })).toBe(false)
    expect(isFeedbackValid({ ...valid, blockCount: null })).toBe(false)
  })
})
