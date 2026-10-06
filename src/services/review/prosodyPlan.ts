import { readyProsodyExercises } from '../content/prosodyRepository'
import { daysBetween, toLocalDateString } from '../progress/progress'
import { nextReviewAfter } from './scheduler'
import type { ProsodyExercise } from '../../features/prosody/types'
import type { AppState, ProsodyPlan } from '../../types/progress'

/** The same excerpt on 3 different days before the spaced reviews start. */
export const LEARNING_DAYS = 3
/** J+1, J+3, J+7 after the last learning day. */
export const REVIEW_OFFSETS = [1, 3, 7] as const
/** "1 à 3 extraits par semaine". */
export const MAX_NEW_EXTRACTS_PER_WEEK = 3
/** One main speaker for 3 to 4 weeks, then 2 or 3 other voices. */
export const MAIN_SPEAKER_DAYS = 28

export type ProsodyAssignmentKind = 'new' | 'daily' | 'review' | 'extra'

export interface ProsodyAssignment {
  kind: ProsodyAssignmentKind
  /** Null for a new extract: it is chosen among the bank. */
  plan: ProsodyPlan | null
  /** Starts from memory, before any listening. */
  cold: boolean
}

function practisedToday(plan: ProsodyPlan, today: string): boolean {
  return plan.practiceDates.includes(today)
}

function startedThisWeek(plan: ProsodyPlan, today: string): boolean {
  const first = plan.practiceDates[0]
  return first !== undefined && daysBetween(today, first) < 7
}

/**
 * What to work on today: a review that is due, else the excerpt of the week
 * (3 days in a row), else a new one — never more than 3 new ones a week.
 */
export function nextProsodyAssignment(
  state: AppState,
  today: string = toLocalDateString(),
): ProsodyAssignment {
  const plans = (state.prosodyPlans ?? []).filter((plan) => !plan.done)

  const review = plans
    .filter((plan) => plan.reviewsDone < REVIEW_OFFSETS.length && plan.nextReview !== null)
    .filter((plan) => (plan.nextReview as string) <= today && !practisedToday(plan, today))
    .sort((a, b) => (a.nextReview as string).localeCompare(b.nextReview as string))[0]
  if (review) return { kind: 'review', plan: review, cold: true }

  const learning = plans
    .filter((plan) => plan.practiceDates.length < LEARNING_DAYS && !practisedToday(plan, today))
    .sort((a, b) => b.practiceDates.length - a.practiceDates.length)[0]
  if (learning) return { kind: 'daily', plan: learning, cold: learning.practiceDates.length > 0 }

  const all = state.prosodyPlans ?? []
  const newThisWeek = all.filter((plan) => startedThisWeek(plan, today)).length
  if (newThisWeek >= MAX_NEW_EXTRACTS_PER_WEEK) {
    // Enough new excerpts this week: practise the latest one again.
    const latest = [...all].sort((a, b) =>
      (b.practiceDates[0] ?? '').localeCompare(a.practiceDates[0] ?? ''),
    )[0]
    if (latest) return { kind: 'extra', plan: latest, cold: true }
  }
  return { kind: 'new', plan: null, cold: false }
}

/**
 * The speaker to practise with: the main one for 3 to 4 weeks, then the other
 * voices so the categories generalise.
 */
export function preferredSpeaker(
  state: AppState,
  today: string = toLocalDateString(),
): { speaker: string | null; avoid: string | null } {
  const main = state.prosodySpeaker
  if (!main) return { speaker: null, avoid: null }
  const age = daysBetween(today, main.since)
  return age < MAIN_SPEAKER_DAYS ? { speaker: main.name, avoid: null } : { speaker: null, avoid: main.name }
}

/**
 * A fresh excerpt: a real, non-scripted voice first (never the voice-over read
 * from a text), the main speaker during the first weeks, then the others.
 */
export function pickNewExtract(
  state: AppState,
  random: () => number = Math.random,
  preferredFocus: string | null = null,
  today: string = toLocalDateString(),
): ProsodyExercise | null {
  const worked = new Set((state.prosodyPlans ?? []).map((plan) => plan.exerciseId))
  const recent = new Set(state.recentProsodyIds)
  const fresh = readyProsodyExercises.filter((item) => !worked.has(item.id) && !recent.has(item.id))
  const pool = fresh.length > 0 ? fresh : readyProsodyExercises.filter((item) => !worked.has(item.id))
  const candidates = pool.length > 0 ? pool : [...readyProsodyExercises]

  const recordings = candidates.filter((item) => item.modelKind === 'recording')
  const natural = recordings.filter((item) => item.style !== 'lu')
  let base = natural.length > 0 ? natural : recordings.length > 0 ? recordings : candidates

  const { speaker, avoid } = preferredSpeaker(state, today)
  const bySpeaker = speaker ? base.filter((item) => item.speaker === speaker) : []
  const others = avoid ? base.filter((item) => item.speaker !== avoid) : []
  if (bySpeaker.length > 0) base = bySpeaker
  else if (others.length > 0) base = others

  const focused = preferredFocus
    ? base.filter((item) => item.focus?.includes(preferredFocus as never))
    : []
  const final = focused.length > 0 ? focused : base
  return final[Math.floor(random() * final.length)] ?? null
}

/** Records a finished session on the excerpt's plan and schedules what follows. */
export function advancePlan(
  state: AppState,
  exercise: Pick<ProsodyExercise, 'id' | 'speaker'>,
  today: string = toLocalDateString(),
  now: Date = new Date(),
): AppState {
  const plans = [...(state.prosodyPlans ?? [])]
  const index = plans.findIndex((plan) => plan.exerciseId === exercise.id)
  const plan: ProsodyPlan =
    index >= 0
      ? { ...plans[index] }
      : {
          exerciseId: exercise.id,
          speaker: exercise.speaker,
          practiceDates: [],
          learnedOn: null,
          reviewsDone: 0,
          nextReview: null,
          done: false,
        }

  const learning = plan.practiceDates.length < LEARNING_DAYS
  if (learning && !plan.practiceDates.includes(today)) {
    plan.practiceDates = [...plan.practiceDates, today]
    if (plan.practiceDates.length >= LEARNING_DAYS) {
      plan.learnedOn = today
      plan.nextReview = nextReviewAfter(REVIEW_OFFSETS[0], now)
    }
  } else if (!learning && plan.nextReview !== null && plan.nextReview <= today && !plan.done) {
    plan.reviewsDone += 1
    if (plan.reviewsDone >= REVIEW_OFFSETS.length) {
      plan.done = true
      plan.nextReview = null
    } else {
      // J+3 and J+7 are counted from the last learning day.
      const learnedOn = plan.learnedOn ?? today
      const gap = REVIEW_OFFSETS[plan.reviewsDone] - daysBetween(today, learnedOn)
      plan.nextReview = nextReviewAfter(Math.max(1, gap), now)
    }
  }

  if (index >= 0) plans[index] = plan
  else plans.push(plan)

  const prosodySpeaker =
    state.prosodySpeaker ?? (exercise.speaker ? { name: exercise.speaker, since: today } : null)
  return { ...state, prosodyPlans: plans, prosodySpeaker }
}
