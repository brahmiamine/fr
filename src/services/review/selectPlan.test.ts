import { describe, expect, it } from 'vitest'
import { buildSessionPlan } from './selectPlan'
import { createInitialState } from '../../types/progress'
import { toLocalDateString } from '../progress/progress'
import type { AppState, WordGap } from '../../types/progress'
import { gapSchedule } from './scheduler'

function stateWithGaps(): AppState {
  const gaps: WordGap[] = [
    {
      id: 'gap-1',
      target: 'prise électrique',
      context: 'l’endroit dans le mur où on branche un appareil',
      createdAt: toLocalDateString(),
      successCount: 0,
      nextReview: toLocalDateString(),
      status: 'learning',
    },
    {
      id: 'gap-2',
      target: 'licenciement',
      context: 'quand une entreprise met fin au contrat d’un salarié',
      createdAt: toLocalDateString(),
      successCount: 0,
      nextReview: toLocalDateString(),
      status: 'learning',
    },
  ]
  return { ...createInitialState(), wordGaps: gaps }
}

describe('buildSessionPlan', () => {
  it('selects a complete session plan without duplicate questions', () => {
    const plan = buildSessionPlan(createInitialState(), () => 0.5)
    expect(plan.topic).toBeDefined()
    expect(plan.questions).toHaveLength(5)
    expect(plan.pivotQuestion).toBeDefined()
    expect(plan.chunks).toHaveLength(3)
    expect(plan.chunksOfDay).toHaveLength(3)
    expect(plan.chunksOfDay.map((chunk) => chunk.id).sort()).toEqual(
      plan.chunks.map((chunk) => chunk.id).sort(),
    )
    expect(plan.gapItems).toHaveLength(5)
    expect(new Set(plan.questions.map((q) => q.id)).size).toBe(5)
    expect(new Set(plan.questions.map((q) => q.category)).size).toBe(5)
  })

  it('prioritises due personal word gaps over generic words', () => {
    const plan = buildSessionPlan(stateWithGaps(), () => 0.5)
    const personal = plan.gapItems.filter((item) => item.isPersonal)
    expect(personal.length).toBeGreaterThanOrEqual(1)
    expect(plan.gapItems[0].kind).toBe('retrieve')
    expect(plan.gapItems[0].context).toContain('mur')
  })

  it('reinjects a successfully retrieved word into spontaneous speaking', () => {
    const state = stateWithGaps()
    state.wordGaps[0] = {
      ...state.wordGaps[0],
      successCount: 1,
      nextReview: '2099-01-01',
    }
    const plan = buildSessionPlan(state, () => 0.5)
    expect(plan.focusWords).toContain('prise électrique')
  })

  it('selects due feedback notes as fluency reminders', () => {
    const state: AppState = {
      ...createInitialState(),
      fluencyNotes: [
        {
          id: 'n1',
          kind: 'importantError',
          text: 'Évite de mélanger depuis et pendant',
          createdAt: toLocalDateString(),
          nextReview: toLocalDateString(),
          timesSeen: 0,
        },
      ],
    }
    expect(buildSessionPlan(state, () => 0.5).fluencyReminders[0].id).toBe('n1')
  })

  it('makes a due personal chunk retrievable like a native chunk', () => {
    const state: AppState = {
      ...createInitialState(),
      personalChunks: [
        {
          id: 'personal-1',
          intent: 'Reformuler',
          expression: 'Ce que je veux dire, c’est que…',
          createdAt: toLocalDateString(),
          nextReview: toLocalDateString(),
        },
      ],
    }
    const plan = buildSessionPlan(state, () => 0)
    expect(plan.chunks.some((chunk) => chunk.id === 'personal-1')).toBe(true)
  })
})

describe('scheduler', () => {
  it('uses +1, +2 and +4-day intervals to land on J+1, J+3 and J+7', () => {
    const miss = gapSchedule(0, false)
    expect(miss.interval).toBe(1)
    expect(miss.mastered).toBe(false)

    const firstHit = gapSchedule(0, true)
    expect(firstHit.interval).toBe(2)
    expect(firstHit.mastered).toBe(false)

    const secondHit = gapSchedule(1, true)
    expect(secondHit.interval).toBe(4)
    expect(secondHit.mastered).toBe(false)

    const thirdHit = gapSchedule(2, true)
    expect(thirdHit.mastered).toBe(true)
  })
})
