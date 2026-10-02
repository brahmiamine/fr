import { RECENT_WINDOWS, WEEKLY_GOAL } from '../../types/progress'
import type {
  AppState,
  ChunkReview,
  PersonalExample,
  SessionRecord,
  WeeklyTestRecord,
  WordGap,
} from '../../types/progress'
import { chunkSchedule, gapSchedule } from '../review/scheduler'
import { contentRepository } from '../content/contentRepository'

export function toLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Monday of the week containing `date`, as a local YYYY-MM-DD string. */
export function getWeekKey(date: Date = new Date()): string {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  return toLocalDateString(addDays(current, diffToMonday))
}

function uniqueSortedDates(sessions: readonly SessionRecord[]): string[] {
  return [...new Set(sessions.map((session) => session.date))].sort()
}

export function calculateTotalPracticeMinutes(
  sessions: readonly SessionRecord[],
): number {
  return sessions.reduce(
    (total, session) => total + (session.durationMinutes || 0),
    0,
  )
}

/** Formats total minutes as "4 h 35" or "35 min". */
export function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 min'
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes} min`
  return `${hours} h ${minutes.toString().padStart(2, '0')}`
}

export function calculateCurrentStreak(
  sessions: readonly SessionRecord[],
  today: Date = new Date(),
): number {
  const dates = uniqueSortedDates(sessions)
  if (dates.length === 0) return 0

  const dateSet = new Set(dates)
  const todayString = toLocalDateString(today)
  const yesterdayString = toLocalDateString(addDays(today, -1))

  let cursor: Date
  if (dateSet.has(todayString)) {
    cursor = parseLocalDate(todayString)
  } else if (dateSet.has(yesterdayString)) {
    cursor = parseLocalDate(yesterdayString)
  } else {
    return 0
  }

  let streak = 0
  while (dateSet.has(toLocalDateString(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function calculateLongestStreak(
  sessions: readonly SessionRecord[],
): number {
  const dates = uniqueSortedDates(sessions)
  if (dates.length === 0) return 0

  let longest = 1
  let current = 1
  for (let i = 1; i < dates.length; i += 1) {
    const previous = parseLocalDate(dates[i - 1])
    const expected = toLocalDateString(addDays(previous, 1))
    if (dates[i] === expected) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 1
    }
  }
  return longest
}

export function calculateWeeklyProgress(
  sessions: readonly SessionRecord[],
  today: Date = new Date(),
): { completed: number; goal: number } {
  const weekKey = getWeekKey(today)
  const weekEnd = toLocalDateString(addDays(parseLocalDate(weekKey), 6))
  const completed = sessions.filter(
    (session) => session.date >= weekKey && session.date <= weekEnd,
  ).length
  return { completed, goal: WEEKLY_GOAL }
}

/** Number of word gaps currently mastered. */
export function masteredGapCount(state: AppState): number {
  return state.wordGaps.filter((gap) => gap.status === 'mastered').length
}

/** Number of chunks currently in the review rotation (not mastered). */
export function activeChunkCount(state: AppState): number {
  const reviewed = state.chunkReviews.filter((review) => !review.mastered).length
  const unseen = contentRepository.chunks.length - state.chunkReviews.length
  return Math.max(0, reviewed + unseen)
}

function pushRecent(list: readonly string[], ids: readonly string[], max: number): string[] {
  const next: string[] = []
  for (const id of [...ids, ...list]) {
    if (!next.includes(id)) next.push(id)
    if (next.length >= max) break
  }
  return next
}

export function recordCompletedSession(
  state: AppState,
  session: SessionRecord,
): AppState {
  return {
    ...state,
    sessions: [...state.sessions, session],
    recentTopicIds: pushRecent(state.recentTopicIds, [session.topicId], RECENT_WINDOWS.topics),
    recentQuestionIds: pushRecent(
      state.recentQuestionIds,
      session.questionIds,
      RECENT_WINDOWS.questions,
    ),
    recentWordIds: pushRecent(state.recentWordIds, session.genericWordIds, RECENT_WINDOWS.words),
    recentChunkIds: pushRecent(state.recentChunkIds, session.chunkIds, RECENT_WINDOWS.chunks),
    inProgressSession: null,
  }
}

export function recordWeeklyTest(
  state: AppState,
  test: WeeklyTestRecord,
): AppState {
  const remaining = state.weeklyTests.filter(
    (existing) => existing.weekKey !== test.weekKey,
  )
  return { ...state, weeklyTests: [...remaining, test] }
}

export function upsertPersonalExample(
  state: AppState,
  example: PersonalExample,
): AppState {
  const others = state.personalExamples.filter(
    (existing) => existing.chunkId !== example.chunkId,
  )
  return { ...state, personalExamples: [...others, example] }
}

export function setInProgressSession(
  state: AppState,
  session: AppState['inProgressSession'],
): AppState {
  return { ...state, inProgressSession: session }
}

export function upsertChunkReview(
  state: AppState,
  chunkId: string,
  result: 'easy' | 'difficult' | 'failed',
  now: Date = new Date(),
): AppState {
  const schedule = chunkSchedule(result, now)
  const existing = state.chunkReviews.find((review) => review.chunkId === chunkId)
  const next: ChunkReview = existing
    ? {
        ...existing,
        nextReview: schedule.nextReview,
        interval: schedule.interval,
        timesSeen: existing.timesSeen + 1,
        timesRecalled:
          existing.timesRecalled + (result === 'failed' ? 0 : 1),
        lastResult: result,
        mastered: result === 'easy' && existing.timesRecalled + 1 >= 2,
      }
    : {
        chunkId,
        nextReview: schedule.nextReview,
        interval: schedule.interval,
        timesSeen: 1,
        timesRecalled: result === 'failed' ? 0 : 1,
        lastResult: result,
        mastered: false,
      }

  const others = state.chunkReviews.filter(
    (review) => review.chunkId !== chunkId,
  )
  return { ...state, chunkReviews: [...others, next] }
}

export function upsertWordGap(
  state: AppState,
  gap: WordGap,
): AppState {
  const others = state.wordGaps.filter((existing) => existing.id !== gap.id)
  return { ...state, wordGaps: [...others, gap] }
}

/** Apply the result of a gap retrieval to its personal word gap. */
export function applyGapResult(
  state: AppState,
  gapId: string,
  found: boolean,
  now: Date = new Date(),
): AppState {
  const existing = state.wordGaps.find((gap) => gap.id === gapId)
  if (!existing) return state

  const schedule = gapSchedule(existing.successCount, found, now)
  const next: WordGap = {
    ...existing,
    successCount: schedule.successCount,
    nextReview: schedule.nextReview,
    status: schedule.mastered ? 'mastered' : 'learning',
  }
  return upsertWordGap(state, next)
}

let gapCounter = 0
export function createWordGap(target: string, context: string, now: Date = new Date()): WordGap {
  gapCounter += 1
  const schedule = gapSchedule(0, false, now)
  return {
    id: `gap-${now.getTime()}-${gapCounter}-${Math.random().toString(36).slice(2, 6)}`,
    target: target.trim(),
    context: context.trim(),
    createdAt: toLocalDateString(now),
    successCount: schedule.successCount,
    nextReview: schedule.nextReview,
    status: 'learning',
  }
}
