import { describe, expect, it } from 'vitest'
import { buildSessionPlan } from '../../services/review/selectPlan'
import { createInitialState } from '../../types/progress'
import {
  activeStages,
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
    expect(state.plan.questions).toHaveLength(2)
    expect(state.plan.zappingQuestions).toHaveLength(4)
    expect(state.plan.roundSeconds).toEqual([240, 180, 120, 120])
    expect(state.plan.taboo?.forbidden.length).toBeGreaterThanOrEqual(3)
  })

  it('skips the reprise when no subject of 2 to 7 days ago is waiting', () => {
    expect(plan.repriseTopic).toBeNull()
    expect(activeStages(plan)).toEqual(['chunks', 'fluency', 'questions', 'gaps', 'feedback'])
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

function answerQuestion(state: TrainingSessionState, rating: 'none' | 'some' | 'much') {
  let next = sessionReducer(state, { type: 'QUESTION_COUNTDOWN_DONE' })
  next = sessionReducer(next, { type: 'QUESTION_PREP_DONE' })
  next = sessionReducer(next, { type: 'QUESTION_SPEAKING_DONE' })
  next = sessionReducer(next, { type: 'QUESTION_RATE', rating })
  return next
}

describe('full session walk', () => {
  it('moves through chunks, fluency, questions + zapping, gaps + taboo and feedback', () => {
    let state = newSession()

    for (const result of ['easy', 'difficult', 'failed', 'discovered'] as const) {
      state = sessionReducer(state, { type: 'CHUNK_REVEAL' })
      state = sessionReducer(state, { type: 'CHUNK_RATE', result })
    }
    state = sessionReducer(state, { type: 'CHUNKS_OF_DAY_CONTINUE' })
    expect(getCurrentStage(state)).toBe('fluency')

    state = sessionReducer(state, {
      type: 'FLUENCY_SET_KEYWORDS',
      keywords: ['travail', 'transport', 'temps', 'stress', 'famille', 'trop'],
    })
    expect(state.fluency.keywords).toEqual(['travail', 'transport', 'temps', 'stress', 'famille'])

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
    expect(state.fluency.stage).toBe('ready')

    for (let i = 0; i < 3; i += 1) {
      // Reading time first, then the round itself.
      state = sessionReducer(state, { type: 'FLUENCY_BEGIN' })
      expect(state.fluency.stage).toBe('running')
      state = sessionReducer(state, { type: 'FLUENCY_ROUND_COMPLETE' })
    }
    expect(state.fluency.stage).toBe('summary')
    state = sessionReducer(state, { type: 'FLUENCY_SUMMARY_DONE' })
    expect(getCurrentStage(state)).toBe('questions')

    // Each question: answer, rate, note what was missing, answer again.
    state = answerQuestion(state, 'none')
    expect(state.questions.stage).toBe('note')
    state = sessionReducer(state, { type: 'QUESTION_NOTE_SET', note: 'un exemple concret' })
    state = sessionReducer(state, { type: 'QUESTION_NOTE_DONE' })
    expect(state.questions.stage).toBe('retry')
    state = sessionReducer(state, { type: 'QUESTION_RETRY_DONE' })
    expect(state.questions).toEqual({ index: 1, stage: 'countdown' })

    state = answerQuestion(state, 'much')
    state = sessionReducer(state, { type: 'QUESTION_NOTE_DONE' })
    state = sessionReducer(state, { type: 'QUESTION_RETRY_DONE' })
    expect(state.questionRetries).toBe(2)
    expect(state.questionNotes[plan.questions[0].id]).toBe('un exemple concret')

    // Then the zapping: four unrelated questions.
    expect(getCurrentStage(state)).toBe('questions')
    expect(state.zapping.stage).toBe('intro')
    state = sessionReducer(state, { type: 'ZAPPING_START' })
    for (let i = 0; i < 4; i += 1) state = sessionReducer(state, { type: 'ZAPPING_NEXT' })
    expect(state.zapping.stage).toBe('done')
    expect(getCurrentStage(state)).toBe('gaps')

    for (let i = 0; i < plan.gapItems.length; i += 1) {
      if (state.gaps.step === 'recall') {
        state = sessionReducer(state, { type: 'GAP_FOUND' })
        state = sessionReducer(state, { type: 'GAP_VERIFY', correct: true })
      } else {
        state = sessionReducer(state, { type: 'GAP_REVEAL' })
      }
      state = sessionReducer(state, { type: 'GAP_NEXT' })
    }
    // The taboo monologue closes the stage.
    expect(getCurrentStage(state)).toBe('gaps')
    expect(state.gaps.index).toBe(plan.gapItems.length)
    state = sessionReducer(state, { type: 'TABOO_START' })
    state = sessionReducer(state, { type: 'TABOO_SPOKEN' })
    state = sessionReducer(state, { type: 'TABOO_RATE', rating: 'some' })
    expect(state.taboo).toEqual({ stage: 'done', rating: 'some' })
    expect(getCurrentStage(state)).toBe('feedback')

    state = sessionReducer(state, { type: 'FEEDBACK_SET', field: 'blockCount', value: 2 })
    state = sessionReducer(state, { type: 'FEEDBACK_SET', field: 'fluencyScore', value: 4 })
    state = sessionReducer(state, { type: 'FEEDBACK_SUBMIT' })
    expect(state.phase).toBe('complete')
  })
})

describe('reprise of a recent subject', () => {
  it('takes the subject up again for 3 minutes, then moves on to the questions', () => {
    const topic = plan.topic
    let state = createSessionState({ ...plan, repriseTopic: topic }, 2)
    state = { ...state, stageIndex: 2 }
    expect(getCurrentStage(state)).toBe('reprise')
    state = sessionReducer(state, { type: 'REPRISE_START' })
    expect(state.reprise.stage).toBe('running')
    state = sessionReducer(state, { type: 'REPRISE_DONE' })
    expect(state.repriseDone).toBe(true)
    expect(getCurrentStage(state)).toBe('questions')
  })

  it('does not count a reprise skipped before it started', () => {
    let state = createSessionState({ ...plan, repriseTopic: plan.topic }, 2)
    state = sessionReducer({ ...state, stageIndex: 2 }, { type: 'REPRISE_DONE' })
    expect(state.repriseDone).toBe(false)
  })
})

describe('session modes', () => {
  it('keeps only chunks, the 4 → 3 → 2, one question and the feedback in the short version', () => {
    const short = buildSessionPlan(createInitialState(), () => 0.5, 'short')
    expect(short.questions).toHaveLength(1)
    expect(short.zappingQuestions).toHaveLength(0)
    expect(activeStages(short)).toEqual(['chunks', 'fluency', 'questions', 'feedback'])
  })

  it('leaves the questions and the gaps to the real conversation', () => {
    const conversation = buildSessionPlan(createInitialState(), () => 0.5, 'conversation')
    expect(activeStages(conversation)).toEqual(['chunks', 'fluency', 'feedback'])
  })
})

describe('question ratings', () => {
  it('records the rating of each first answer', () => {
    let state = { ...newSession(), stageIndex: 3 }
    state = answerQuestion(state, 'much')
    expect(state.questionRatings).toEqual([{ questionId: plan.questions[0].id, rating: 'much' }])
  })

  it('gives the advanced level the opposite position on the second answer only on screen', () => {
    // The level does not change the flow: answer → rate → note → retry.
    let state = { ...createSessionState(plan, 3), stageIndex: 3 }
    state = answerQuestion(state, 'none')
    expect(state.questions.stage).toBe('note')
  })
})

describe('word gap verification', () => {
  it('records a found word only after the learner checked the answer', () => {
    let state = { ...newSession(), stageIndex: 4 }
    state = { ...state, gaps: { index: 0, step: 'recall' } }
    state = sessionReducer(state, { type: 'GAP_FOUND' })
    expect(state.gaps.step).toBe('verify')
    expect(state.gapResults).toEqual([])

    state = sessionReducer(state, { type: 'GAP_VERIFY', correct: false })
    expect(state.gaps.step).toBe('revealed')
    expect(state.gapResults).toEqual([
      { itemKey: plan.gapItems[0].key, found: false },
    ])
  })

  it('lets the learner keep a generic word in their personal gap list', () => {
    const genericIndex = plan.gapItems.findIndex((item) => !item.isPersonal)
    let state = { ...newSession(), stageIndex: 4 }
    state = { ...state, gaps: { index: genericIndex, step: 'revealed' } }
    state = sessionReducer(state, { type: 'GAP_CAPTURE', context: 'le bouton au mur' })
    expect(state.gapCaptures).toEqual([
      { target: plan.gapItems[genericIndex].target, context: 'le bouton au mur' },
    ])
    state = sessionReducer(state, { type: 'GAP_CAPTURE', context: '' })
    expect(state.gapCaptures).toEqual([])
  })
})

describe('chunks of the day usage', () => {
  it('tracks the chunks the learner really placed while speaking', () => {
    let state = newSession()
    state = sessionReducer(state, { type: 'CHUNK_TOGGLE_USED', chunkId: 'chunk_001' })
    expect(state.usedChunkIds).toEqual(['chunk_001'])
    state = sessionReducer(state, { type: 'CHUNK_TOGGLE_USED', chunkId: 'chunk_001' })
    expect(state.usedChunkIds).toEqual([])
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

describe('skipping questions', () => {
  it('moves on without recording a rating', () => {
    let state = { ...newSession(), stageIndex: 3 }
    state = sessionReducer(state, { type: 'QUESTION_SKIP' })
    expect(state.questions).toEqual({ index: 1, stage: 'countdown' })
    expect(state.questionRatings).toHaveLength(0)
  })

  it('reaches the zapping when every question was skipped, and skipping it ends the stage', () => {
    let state = { ...newSession(), stageIndex: 3 }
    for (let i = 0; i < plan.questions.length; i += 1) {
      state = sessionReducer(state, { type: 'QUESTION_SKIP' })
    }
    expect(state.zapping.stage).toBe('intro')
    state = sessionReducer(state, { type: 'QUESTION_SKIP' })
    expect(getCurrentStage(state)).toBe('gaps')
  })
})

describe('skipping other exercises', () => {
  it('skips a chunk without rating it, then reaches the chunks of the day', () => {
    let state = newSession()
    for (let i = 0; i < plan.chunks.length; i += 1) {
      state = sessionReducer(state, { type: 'CHUNK_SKIP' })
    }
    expect(state.chunkResults).toHaveLength(0)
    expect(state.chunks.step).toBe('day')
  })

  it('sends a skipped running round to the mini feedback, exactly like a finished one', () => {
    const runningFirstRound = {
      ...newSession(),
      stageIndex: 1,
      fluency: { roundIndex: 0, stage: 'running' as const, keywords: [], recordAll: true },
    }

    const skipped = sessionReducer(runningFirstRound, { type: 'FLUENCY_SKIP' })
    expect(skipped.fluency).toMatchObject({ roundIndex: 0, stage: 'feedback' })

    const nextRound = sessionReducer(skipped, { type: 'FLUENCY_SKIP' })
    expect(nextRound.fluency).toMatchObject({ roundIndex: 1, stage: 'ready' })
    expect(
      sessionReducer(nextRound, { type: 'FLUENCY_BEGIN' }).fluency,
    ).toMatchObject({ roundIndex: 1, stage: 'running' })
  })

  it('skips one fluency round at a time, then reaches the summary after the transfert', () => {
    let state = { ...newSession(), stageIndex: 1 }

    // Skipped from the preparation screen: straight to the next round.
    state = sessionReducer(state, { type: 'FLUENCY_SKIP' })
    expect(state.fluency).toMatchObject({ roundIndex: 1, stage: 'ready' })
    expect(getCurrentStage(state)).toBe('fluency')

    for (let i = 0; i < 3; i += 1) {
      state = sessionReducer(state, { type: 'FLUENCY_SKIP' })
    }
    expect(state.fluency.stage).toBe('summary')

    state = sessionReducer(state, { type: 'FLUENCY_SUMMARY_DONE' })
    expect(getCurrentStage(state)).toBe('questions')

    state = { ...state, stageIndex: 4 }
    state = sessionReducer(state, { type: 'GAP_NEXT' })
    expect(state.gapResults).toHaveLength(0)
  })

  it('replays the recorded rounds after the transfert, or moves on when recording is off', () => {
    const atTransfert = { ...newSession(), stageIndex: 1, fluency: { roundIndex: 3, stage: 'running' as const, keywords: [], recordAll: true } }

    const withSummary = sessionReducer(atTransfert, { type: 'FLUENCY_ROUND_COMPLETE' })
    expect(withSummary.fluency.stage).toBe('summary')
    // No subject to take up again: the reprise is skipped.
    expect(
      sessionReducer(withSummary, { type: 'FLUENCY_SUMMARY_DONE' }).stageIndex,
    ).toBe(3)

    const withoutSummary = sessionReducer(
      { ...atTransfert, fluency: { ...atTransfert.fluency, recordAll: false } },
      { type: 'FLUENCY_ROUND_COMPLETE' },
    )
    expect(getCurrentStage(withoutSummary)).toBe('questions')
  })

  it('keeps an AI transfer subject only until the transfer round is reached', () => {
    const withFluency = (roundIndex: number, transferPrompt?: string) => ({
      ...newSession(),
      stageIndex: 1,
      fluency: {
        roundIndex,
        stage: 'running' as const,
        keywords: [],
        recordAll: true,
        transferPrompt,
      },
    })

    const stored = sessionReducer(withFluency(1), {
      type: 'FLUENCY_SET_TRANSFER',
      prompt: '  Ville ou campagne ?  ',
    })
    expect(stored.fluency.transferPrompt).toBe('Ville ou campagne ?')

    // Set once: a second answer never replaces the first.
    const second = sessionReducer(stored, { type: 'FLUENCY_SET_TRANSFER', prompt: 'Autre' })
    expect(second.fluency.transferPrompt).toBe('Ville ou campagne ?')

    // Too late: the learner is already on the transfer round.
    const late = withFluency(3)
    expect(sessionReducer(late, { type: 'FLUENCY_SET_TRANSFER', prompt: 'Trop tard' })).toBe(late)

    const empty = withFluency(0)
    expect(sessionReducer(empty, { type: 'FLUENCY_SET_TRANSFER', prompt: '  ' })).toBe(empty)
  })

  it('completes the session when the feedback is skipped', () => {
    const state = sessionReducer({ ...newSession(), stageIndex: 5 }, { type: 'FEEDBACK_SKIP' })
    expect(state.phase).toBe('complete')
  })
})
