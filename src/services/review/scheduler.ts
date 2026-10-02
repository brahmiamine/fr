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

/** Spaced schedule for a chunk, based on how well it was recalled. */
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
 * Spaced schedule for a personal word gap. A missed word returns tomorrow,
 * then after 3 days, then after 7 days. Two successful retrievals mark it as
 * mastered.
 */
export function gapSchedule(
  successCount: number,
  found: boolean,
  now: Date = new Date(),
): GapSchedule {
  if (found) {
    const nextCount = successCount + 1
    const mastered = nextCount >= 2
    const interval = nextCount === 1 ? 3 : 7
    return {
      interval,
      nextReview: mastered ? nextReviewAfter(30, now) : nextReviewAfter(interval, now),
      successCount: nextCount,
      mastered,
    }
  }

  return {
    interval: 1,
    nextReview: nextReviewAfter(1, now),
    successCount: 0,
    mastered: false,
  }
}
