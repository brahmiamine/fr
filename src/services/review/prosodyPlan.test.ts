import { describe, expect, it } from 'vitest'
import { createInitialState } from '../../types/progress'
import type { AppState, ProsodyPlan } from '../../types/progress'
import {
  LEARNING_DAYS,
  MAX_NEW_EXTRACTS_PER_WEEK,
  advancePlan,
  nextProsodyAssignment,
  pickNewExtract,
  preferredSpeaker,
} from './prosodyPlan'

const exercise = { id: 'ex-1', speaker: 'Locuteur A' }

function baseState(overrides: Partial<AppState> = {}): AppState {
  return { ...createInitialState(), ...overrides }
}

function plan(overrides: Partial<ProsodyPlan> = {}): ProsodyPlan {
  return {
    exerciseId: 'ex-1',
    speaker: 'Locuteur A',
    practiceDates: [],
    learnedOn: null,
    reviewsDone: 0,
    nextReview: null,
    done: false,
    ...overrides,
  }
}

describe('advancePlan', () => {
  it('records three learning days then schedules the J+1 review', () => {
    let state = baseState()
    state = advancePlan(state, exercise, '2026-01-01', new Date(2026, 0, 1))
    expect(state.prosodyPlans[0]?.practiceDates).toEqual(['2026-01-01'])
    expect(state.prosodyPlans[0]?.learnedOn).toBeNull()
    expect(state.prosodyPlans[0]?.nextReview).toBeNull()

    state = advancePlan(state, exercise, '2026-01-02', new Date(2026, 0, 2))
    expect(state.prosodyPlans[0]?.practiceDates).toEqual(['2026-01-01', '2026-01-02'])

    state = advancePlan(state, exercise, '2026-01-03', new Date(2026, 0, 3))
    expect(state.prosodyPlans[0]?.practiceDates).toEqual([
      '2026-01-01',
      '2026-01-02',
      '2026-01-03',
    ])
    expect(state.prosodyPlans[0]?.learnedOn).toBe('2026-01-03')
    expect(state.prosodyPlans[0]?.nextReview).toBe('2026-01-04')
  })

  it('spaces the reviews at J+1, J+3 and J+7 from the last learning day', () => {
    let state = baseState()
    for (const [day, date] of [
      ['2026-01-01', new Date(2026, 0, 1)],
      ['2026-01-02', new Date(2026, 0, 2)],
      ['2026-01-03', new Date(2026, 0, 3)],
    ] as const) {
      state = advancePlan(state, exercise, day, date)
    }

    state = advancePlan(state, exercise, '2026-01-04', new Date(2026, 0, 4))
    expect(state.prosodyPlans[0]?.reviewsDone).toBe(1)
    expect(state.prosodyPlans[0]?.nextReview).toBe('2026-01-06')

    state = advancePlan(state, exercise, '2026-01-06', new Date(2026, 0, 6))
    expect(state.prosodyPlans[0]?.reviewsDone).toBe(2)
    expect(state.prosodyPlans[0]?.nextReview).toBe('2026-01-10')

    state = advancePlan(state, exercise, '2026-01-10', new Date(2026, 0, 10))
    expect(state.prosodyPlans[0]?.done).toBe(true)
    expect(state.prosodyPlans[0]?.nextReview).toBeNull()
  })
})

describe('nextProsodyAssignment', () => {
  it('starts with a new extract', () => {
    expect(nextProsodyAssignment(baseState(), '2026-01-01')).toMatchObject({
      kind: 'new',
      plan: null,
      cold: false,
    })
  })

  it('continues the learning of the week before starting a new one', () => {
    const state = baseState({
      prosodyPlans: [plan({ practiceDates: ['2026-01-01'] })],
    })
    expect(nextProsodyAssignment(state, '2026-01-02')).toMatchObject({
      kind: 'daily',
      cold: true,
    })
  })

  it('starts a review cold when it is due', () => {
    const state = baseState({
      prosodyPlans: [
        plan({
          practiceDates: ['2026-01-01', '2026-01-02', '2026-01-03'],
          learnedOn: '2026-01-03',
          nextReview: '2026-01-04',
        }),
      ],
    })
    expect(nextProsodyAssignment(state, '2026-01-04')).toMatchObject({
      kind: 'review',
      cold: true,
    })
  })

  it('never starts more than 3 new extracts in a week', () => {
    const state = baseState({
      prosodyPlans: [1, 2, 3].map((i) =>
        plan({
          exerciseId: `ex-${i}`,
          practiceDates: ['2026-01-01', '2026-01-02', '2026-01-03'],
          learnedOn: '2026-01-03',
          nextReview: '2026-01-04',
        }),
      ),
    })
    expect(MAX_NEW_EXTRACTS_PER_WEEK).toBe(3)
    expect(LEARNING_DAYS).toBe(3)
    expect(nextProsodyAssignment(state, '2026-01-03')).toMatchObject({ kind: 'extra' })
  })
})

describe('preferredSpeaker', () => {
  it('keeps the main speaker for 28 days, then avoids it', () => {
    const state = baseState({ prosodySpeaker: { name: 'Locuteur A', since: '2026-01-01' } })
    expect(preferredSpeaker(state, '2026-01-20')).toEqual({ speaker: 'Locuteur A', avoid: null })
    expect(preferredSpeaker(state, '2026-02-01')).toEqual({ speaker: null, avoid: 'Locuteur A' })
  })

  it('has no preference without a main speaker', () => {
    expect(preferredSpeaker(baseState(), '2026-01-10')).toEqual({ speaker: null, avoid: null })
  })
})

describe('pickNewExtract', () => {
  it('picks a real, non-scripted recording as the main model', () => {
    const picked = pickNewExtract(baseState(), () => 0)
    expect(picked).not.toBeNull()
    expect(picked?.modelKind).toBe('recording')
    expect(picked?.style).not.toBe('lu')
  })
})
