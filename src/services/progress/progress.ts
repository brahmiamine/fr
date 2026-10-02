import { RECENT_WINDOWS, WEEKLY_GOAL } from '../../types/progress'
import type {
  AppStateV1,
  NativeExpressionExample,
  SessionRecord,
  WeeklyTestRecord,
} from '../../types/progress'

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

function pushRecent(list: readonly string[], ids: readonly string[], max: number): string[] {
  const next: string[] = []
  for (const id of [...ids, ...list]) {
    if (!next.includes(id)) next.push(id)
    if (next.length >= max) break
  }
  return next
}

export function recordCompletedSession(
  state: AppStateV1,
  session: SessionRecord,
): AppStateV1 {
  return {
    ...state,
    sessions: [...state.sessions, session],
    recentTopicIds: pushRecent(state.recentTopicIds, [session.topicId], RECENT_WINDOWS.topics),
    recentQuestionIds: pushRecent(
      state.recentQuestionIds,
      session.questionIds,
      RECENT_WINDOWS.questions,
    ),
    recentWordIds: pushRecent(state.recentWordIds, session.wordIds, RECENT_WINDOWS.words),
    recentExpressionIds: pushRecent(
      state.recentExpressionIds,
      session.expressionIds,
      RECENT_WINDOWS.expressions,
    ),
    inProgressSession: null,
  }
}

export function recordWeeklyTest(
  state: AppStateV1,
  test: WeeklyTestRecord,
): AppStateV1 {
  const remaining = state.weeklyTests.filter(
    (existing) => existing.weekKey !== test.weekKey,
  )
  return { ...state, weeklyTests: [...remaining, test] }
}

export function upsertExpressionExamples(
  state: AppStateV1,
  example: NativeExpressionExample,
): AppStateV1 {
  const others = state.nativeExpressionExamples.filter(
    (existing) => existing.expressionId !== example.expressionId,
  )
  return {
    ...state,
    nativeExpressionExamples: [...others, example],
  }
}

export function setInProgressSession(
  state: AppStateV1,
  session: AppStateV1['inProgressSession'],
): AppStateV1 {
  return { ...state, inProgressSession: session }
}
