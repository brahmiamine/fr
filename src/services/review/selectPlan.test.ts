import { describe, expect, it } from 'vitest'
import { buildSessionPlan, isConstantTimeSession, selectRepriseTopic } from './selectPlan'
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
    expect(plan.questions).toHaveLength(2)
    expect(plan.zappingQuestions).toHaveLength(4)
    expect(plan.chunks).toHaveLength(4)
    expect(plan.chunksOfDay).toHaveLength(4)
    expect(plan.chunksOfDay.map((chunk) => chunk.id).sort()).toEqual(
      plan.chunks.map((chunk) => chunk.id).sort(),
    )
    expect(plan.gapItems).toHaveLength(4)
    const asked = [...plan.questions, ...plan.zappingQuestions]
    expect(new Set(asked.map((q) => q.id)).size).toBe(6)
    expect(new Set(asked.map((q) => q.category)).size).toBe(6)
  })

  it('brings back a question with a big block once it is due, before new ones', () => {
    const state = {
      ...createInitialState(),
      questionReviews: [{ questionId: 'q010', nextReview: toLocalDateString() }],
    }
    const plan = buildSessionPlan(state, () => 0.5)
    expect(plan.questions[0].id).toBe('q010')
    expect(plan.zappingQuestions.map((q) => q.id)).not.toContain('q010')
  })

  it('takes up again a subject spoken 2 to 7 days ago, only once', () => {
    const now = new Date(2026, 9, 6, 10)
    const session = (id: string, daysAgo: number, extra = {}) => ({
      id,
      date: toLocalDateString(new Date(2026, 9, 6 - daysAgo)),
      completedAt: new Date(2026, 9, 6 - daysAgo).toISOString(),
      durationMinutes: 40,
      blockCount: 0,
      fluencyScore: 3,
      blockedWord: '',
      expressionToReuse: '',
      topicId: id,
      questionIds: [],
      chunkIds: [],
      genericWordIds: [],
      summary: { chunksWorked: 0, gapsPracticed: 0, questionsAsked: 0, fluencyDone: true },
      ...extra,
    })
    const tooRecent = session('t001', 1)
    const due = session('t002', 3)
    const tooOld = session('t003', 9)
    const state = { ...createInitialState(), sessions: [tooOld, due, tooRecent] }
    expect(selectRepriseTopic(state, toLocalDateString(now))?.id).toBe('t002')
    expect(buildSessionPlan(state, () => 0.5, 'full', now).repriseTopic?.id).toBe('t002')
    expect(buildSessionPlan(state, () => 0.5, 'full', now).topic.id).not.toBe('t002')

    const reprised = { ...state, sessions: [...state.sessions, session('t004', 0, { repriseTopicId: 't002' })] }
    expect(selectRepriseTopic(reprised, toLocalDateString(now))).toBeNull()
  })

  it('switches to the 3/3/3 version once a week, on the third session', () => {
    const monday = new Date(2026, 9, 5, 9)
    const wednesday = new Date(2026, 9, 7, 9)
    const done = (day: number, constantTime = false) => ({
      id: `s${day}`,
      date: toLocalDateString(new Date(2026, 9, day)),
      completedAt: new Date(2026, 9, day).toISOString(),
      durationMinutes: 40,
      blockCount: 0,
      fluencyScore: 3,
      blockedWord: '',
      expressionToReuse: '',
      topicId: 't001',
      questionIds: [],
      chunkIds: [],
      genericWordIds: [],
      summary: { chunksWorked: 0, gapsPracticed: 0, questionsAsked: 0, fluencyDone: true, constantTime },
    })
    const twoDone = { ...createInitialState(), sessions: [done(5), done(6)] }
    expect(isConstantTimeSession(createInitialState(), monday)).toBe(false)
    expect(isConstantTimeSession(twoDone, wednesday)).toBe(true)
    expect(buildSessionPlan(twoDone, () => 0.5, 'full', wednesday).roundSeconds).toEqual([180, 180, 180, 120])
    const alreadyDone = { ...createInitialState(), sessions: [done(5, true), done(6)] }
    expect(isConstantTimeSession(alreadyDone, wednesday)).toBe(false)
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

  it('reinjects a word revealed today, but never one due for retrieval today', () => {
    const revealed = stateWithGaps()
    revealed.wordGaps[0] = { ...revealed.wordGaps[0], successCount: 0, nextReview: '2099-01-01' }
    expect(buildSessionPlan(revealed, () => 0.5).focusWords).toContain('prise électrique')

    const due = stateWithGaps()
    due.wordGaps[0] = { ...due.wordGaps[0], nextReview: toLocalDateString() }
    expect(buildSessionPlan(due, () => 0.5).focusWords).not.toContain('prise électrique')
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

describe('alignment extras in the session plan', () => {
  const fakeSession = (index: number) => ({
    id: `s-${index}`,
    date: '2026-10-01',
    completedAt: `2026-10-01T0${index}:00:00.000Z`,
    durationMinutes: 30,
    blockCount: 1,
    fluencyScore: 3,
    blockedWord: '',
    expressionToReuse: '',
    topicId: 't001',
    questionIds: [],
    chunkIds: [],
    genericWordIds: [],
    summary: { chunksWorked: 4, gapsPracticed: 5, questionsAsked: 5, fluencyDone: true },
  })

  it('flags never-seen chunks as new so they are discovered, not guessed', () => {
    const plan = buildSessionPlan(createInitialState(), () => 0.5)
    expect(plan.newChunkIds).toEqual(plan.chunks.map((chunk) => chunk.id))

    const reviewed = buildSessionPlan(
      {
        ...createInitialState(),
        chunkReviews: plan.chunks.map((chunk) => ({
          chunkId: chunk.id,
          nextReview: toLocalDateString(),
          interval: 1,
          timesSeen: 1,
          timesRecalled: 1,
          streak: 1,
          lastResult: 'easy' as const,
          mastered: false,
        })),
      },
      () => 0.5,
    )
    expect(reviewed.newChunkIds).toEqual([])
  })

  it('turns every third 4-3-2 into a story retelling', () => {
    expect(buildSessionPlan(createInitialState(), () => 0.5).retellingStory).toBeNull()

    const third = buildSessionPlan(
      { ...createInitialState(), sessions: [fakeSession(1), fakeSession(2)] },
      () => 0.5,
    )
    expect(third.retellingStory).not.toBeNull()
    expect(third.topic.id).toBe(third.retellingStory?.id)
    expect(third.topic.transferPrompt).toBe(third.retellingStory?.transferPrompt)
  })

  it('brings the recent prosody focus into fluency practice', () => {
    const plan = buildSessionPlan(
      {
        ...createInitialState(),
        prosodySessions: [
          {
            id: 'p1',
            exerciseId: 'prosody_001',
            date: '2026-10-01',
            completedAt: '2026-10-01T08:00:00.000Z',
            durationMinutes: 12,
            focus: 'pause',
            retellingSeconds: 40,
          },
        ],
      },
      () => 0.5,
    )
    expect(plan.prosodyFocusGoal).toMatch(/groupe/)
  })
})
