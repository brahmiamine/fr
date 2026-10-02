import { describe, expect, it } from 'vitest'
import { buildSessionPlan } from './selectPlan'
import { createInitialState } from '../../types/progress'
import { toLocalDateString } from '../progress/progress'
import type { AppState, WordGap } from '../../types/progress'
import { chunkSchedule, gapSchedule } from './scheduler'

function stateWithGaps(): AppState {
  const gaps: WordGap[] = [
    {
      id: 'gap-1',
      target: 'prise électrique',
      context: 'où on branche un appareil',
      createdAt: toLocalDateString(),
      successCount: 0,
      nextReview: toLocalDateString(),
      status: 'learning',
    },
    {
      id: 'gap-2',
      target: 'licenciement',
      context: '',
      createdAt: toLocalDateString(),
      successCount: 0,
      nextReview: toLocalDateString(),
      status: 'learning',
    },
  ]
  return { ...createInitialState(), wordGaps: gaps }
}

describe('buildSessionPlan', () => {
  it('selects a topic, questions, chunks and gap items without duplicates', () => {
    const plan = buildSessionPlan(createInitialState(), () => 0.5)

    expect(plan.topic).toBeDefined()
    expect(plan.questions).toHaveLength(5)
    expect(plan.chunks).toHaveLength(3)
    expect(plan.chunksOfDay.length).toBeGreaterThanOrEqual(1)
    expect(plan.gapItems).toHaveLength(5)

    const questionIds = plan.questions.map((q) => q.id)
    expect(new Set(questionIds).size).toBe(questionIds.length)
  })

  it('prioritises personal word gaps over generic words', () => {
    const plan = buildSessionPlan(stateWithGaps(), () => 0.5)
    const personal = plan.gapItems.filter((item) => item.isPersonal)
    // Both personal gaps are due and should appear before generic words.
    expect(personal.length).toBeGreaterThanOrEqual(1)
    expect(plan.gapItems[0].isPersonal).toBe(true)
    expect(plan.gapItems[0].kind).toBe('retrieve')
    expect(plan.gapItems[0].target).toBe('prise électrique')
  })

  it('uses only generic words when there are no personal gaps', () => {
    const plan = buildSessionPlan(createInitialState(), () => 0.5)
    expect(plan.gapItems.every((item) => !item.isPersonal)).toBe(true)
    expect(plan.gapItems.every((item) => item.kind === 'paraphrase')).toBe(true)
  })
})

describe('scheduler', () => {
  it('schedules chunks with growing intervals', () => {
    expect(chunkSchedule('easy').interval).toBe(7)
    expect(chunkSchedule('difficult').interval).toBe(3)
    expect(chunkSchedule('failed').interval).toBe(1)
  })

  it('schedules word gaps: tomorrow, then 3 days, then mastered', () => {
    const miss = gapSchedule(0, false)
    expect(miss.interval).toBe(1)
    expect(miss.mastered).toBe(false)

    const firstHit = gapSchedule(0, true)
    expect(firstHit.interval).toBe(3)
    expect(firstHit.mastered).toBe(false)

    const secondHit = gapSchedule(1, true)
    expect(secondHit.interval).toBe(7)
    expect(secondHit.mastered).toBe(true)
  })
})
