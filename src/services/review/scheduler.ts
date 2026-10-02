import { toLocalDateString } from '../progress/progress'
import type { RecallResult } from '../../features/training/types'

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function nextReviewAfter(days: number, from: Date = new Date()): string {
  return toLocalDateString(addDays(from, days))
}

export function chunkSchedule(
  result: RecallResult,
  now: Date = new Date(),
): { interval: number; nextReview: string } {
  const days = result === 'easy' ? 7 : result === 'difficult' ? 3 : 1
  return { interval: days, nextReview: nextReviewAfter(days, now) }
}

export interface GapSchedule {
  interval: number
  nextReview: string
  successCount: number
  mastered: boolean
}

/**
 * Personal word gaps follow the complete J+1 -> J+3 -> J+7 path.
 * A miss returns tomorrow; three successful retrievals are required before
 * mastery so the J+7 retrieval is actually performed rather than skipped.
 */
export function gapSchedule(
  successCount: number,
  found: boolean,
  now: Date = new Date(),
): GapSchedule {
  if (!found) {
    return {
      interval: 1,
      nextReview: nextReviewAfter(1, now),
      successCount: 0,
      mastered: false,
    }
  }

  const nextCount = successCount + 1
  if (nextCount === 1) {
    return {
      interval: 3,
      nextReview: nextReviewAfter(3, now),
      successCount: nextCount,
      mastered: false,
    }
  }
  if (nextCount === 2) {
    return {
      interval: 7,
      nextReview: nextReviewAfter(7, now),
      successCount: nextCount,
      mastered: false,
    }
  }
  return {
    interval: 30,
    nextReview: nextReviewAfter(30, now),
    successCount: nextCount,
    mastered: true,
  }
}
