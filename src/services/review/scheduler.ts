import { toLocalDateString } from '../progress/progress'

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function nextReviewAfter(days: number, from: Date = new Date()): string {
  return toLocalDateString(addDays(from, days))
}

export interface GapSchedule {
  interval: number
  nextReview: string
  successCount: number
  mastered: boolean
}

/**
 * A new personal word is first reviewed tomorrow, then successful recalls land
 * on J+3 and J+7 relative to the original capture date: +1, then +2, then +4.
 * A miss restarts the path from tomorrow.
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
      interval: 2,
      nextReview: nextReviewAfter(2, now),
      successCount: nextCount,
      mastered: false,
    }
  }
  if (nextCount === 2) {
    return {
      interval: 4,
      nextReview: nextReviewAfter(4, now),
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
