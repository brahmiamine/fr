import { RECENT_WINDOWS, WEEKLY_GOAL } from '../../types/progress'
import type {
  AppState,
  ChunkReview,
  ConversationPractice,
  FluencyNote,
  FluencyNoteKind,
  PersonalChunk,
  ProsodySessionRecord,
  SessionRecord,
  WeeklyTestRecord,
  WordGap,
} from '../../types/progress'
import { gapSchedule, nextReviewAfter } from '../review/scheduler'
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

export function getWeekKey(date: Date = new Date()): string {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = current.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  return toLocalDateString(addDays(current, diffToMonday))
}

export function trainingLevelForSessionCount(count: number): 1 | 2 | 3 {
  if (count < 5) return 1
  if (count < 15) return 2
  return 3
}

/** Share of surprise questions with a big block above which the level waits. */
export const LEVEL_UP_MAX_MUCH_BLOCK_RATIO = 0.4

/**
 * Preparation time shrinks progressively (10 s → 5 s → 3 s), but only when
 * the learner copes: if the last 3 sessions still had many big blocks on
 * surprise questions, the level stays one step lower.
 */
export function trainingLevelForSessions(
  sessions: readonly SessionRecord[],
): 1 | 2 | 3 {
  const byCount = trainingLevelForSessionCount(sessions.length)
  if (byCount === 1) return 1
  const recent = [...sessions]
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt))
    .slice(-3)
    .map((session) => session.summary?.questionBlocks)
    .filter((blocks): blocks is NonNullable<typeof blocks> => Boolean(blocks))
  if (recent.length === 0) return byCount
  const totals = recent.reduce(
    (sum, blocks) => ({
      much: sum.much + blocks.much,
      all: sum.all + blocks.none + blocks.some + blocks.much,
    }),
    { much: 0, all: 0 },
  )
  if (totals.all === 0) return byCount
  if (totals.much / totals.all >= LEVEL_UP_MAX_MUCH_BLOCK_RATIO) {
    return (byCount - 1) as 1 | 2
  }
  return byCount
}

function uniqueSortedDates(sessions: readonly SessionRecord[]): string[] {
  return [...new Set(sessions.map((session) => session.date))].sort()
}

export function calculateTotalPracticeMinutes(
  sessions: readonly SessionRecord[],
): number {
  return sessions.reduce((total, session) => total + (session.durationMinutes || 0), 0)
}

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
  if (dateSet.has(todayString)) cursor = parseLocalDate(todayString)
  else if (dateSet.has(yesterdayString)) cursor = parseLocalDate(yesterdayString)
  else return 0

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
    } else current = 1
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

export function masteredGapCount(state: AppState): number {
  return state.wordGaps.filter((gap) => gap.status === 'mastered').length
}

export function activeChunkCount(state: AppState): number {
  const reviews = new Map(state.chunkReviews.map((review) => [review.chunkId, review]))
  const ids = [
    ...contentRepository.chunks.map((chunk) => chunk.id),
    ...state.personalChunks.map((chunk) => chunk.id),
  ]
  return ids.filter((id) => !reviews.get(id)?.mastered).length
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
  const sessions = [...state.sessions, session]
  return {
    ...state,
    sessions,
    level: trainingLevelForSessions(sessions),
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

export function recordProsodySession(
  state: AppState,
  session: ProsodySessionRecord,
): AppState {
  return {
    ...state,
    prosodySessions: [...state.prosodySessions, session],
    recentProsodyIds: pushRecent(
      state.recentProsodyIds,
      [session.exerciseId],
      RECENT_WINDOWS.prosody,
    ),
  }
}

/**
 * The prosody point the learner chose most often in their last 5 sessions
 * (most recent wins a tie). Used to pick matching excerpts and to keep the
 * same point in mind during fluency practice.
 */
export function recentProsodyFocus(
  sessions: readonly ProsodySessionRecord[],
): ProsodySessionRecord['focus'] {
  const recent = [...sessions]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, 5)
    .map((session) => session.focus)
    .filter((focus): focus is NonNullable<typeof focus> => Boolean(focus))
  if (recent.length === 0) return null
  const counts = new Map<string, number>()
  for (const focus of recent) counts.set(focus, (counts.get(focus) ?? 0) + 1)
  let best = recent[0]
  for (const focus of recent) {
    if ((counts.get(focus) ?? 0) > (counts.get(best) ?? 0)) best = focus
  }
  return best
}

export function calculateProsodyMinutes(
  sessions: readonly ProsodySessionRecord[],
): number {
  return sessions.reduce(
    (total, session) => total + (session.durationMinutes || 0),
    0,
  )
}

/** Whole days from `b` to `a` (local dates "YYYY-MM-DD"). */
export function daysBetween(a: string, b: string): number {
  return dayDistance(a, b)
}

function dayDistance(a: string, b: string): number {
  return Math.round(
    (parseLocalDate(a).getTime() - parseLocalDate(b).getTime()) / 86400000,
  )
}

/**
 * "Toi cette semaine ↔ toi il y a quatre semaines": the test closest to four
 * weeks before `weekKey`, accepted between three and six weeks back so one
 * missed week does not hide the comparison.
 */
export function findComparisonTest(
  tests: readonly WeeklyTestRecord[],
  weekKey: string,
): WeeklyTestRecord | null {
  let best: WeeklyTestRecord | null = null
  let bestGap = Infinity
  for (const test of tests) {
    const daysBack = dayDistance(weekKey, test.weekKey)
    if (daysBack < 21 || daysBack > 42) continue
    const gap = Math.abs(daysBack - 28)
    if (gap < bestGap) {
      best = test
      bestGap = gap
    }
  }
  return best
}

export function recordWeeklyTest(state: AppState, test: WeeklyTestRecord): AppState {
  const remaining = state.weeklyTests.filter((existing) => existing.weekKey !== test.weekKey)
  return { ...state, weeklyTests: [...remaining, test] }
}

export function recordConversationPractice(
  state: AppState,
  practice: ConversationPractice,
): AppState {
  const remaining = state.conversationPractices.filter(
    (existing) => existing.weekKey !== practice.weekKey,
  )
  return { ...state, conversationPractices: [...remaining, practice] }
}

/**
 * "Une question ratée revient dans la pioche 3 à 7 jours plus tard": a big
 * block schedules the question again at J+3; any other answer to a question
 * that was waiting closes its review.
 */
export function applyQuestionRatings(
  state: AppState,
  ratings: readonly { questionId: string; rating: 'none' | 'some' | 'much' }[],
  now: Date = new Date(),
  reviewDays = 3,
): AppState {
  let reviews = [...(state.questionReviews ?? [])]
  for (const { questionId, rating } of ratings) {
    reviews = reviews.filter((review) => review.questionId !== questionId)
    if (rating === 'much') {
      reviews.push({ questionId, nextReview: nextReviewAfter(reviewDays, now) })
    }
  }
  return { ...state, questionReviews: reviews }
}

export function setInProgressSession(
  state: AppState,
  session: AppState['inProgressSession'],
): AppState {
  return { ...state, inProgressSession: session }
}

/**
 * Spaced retrieval of a chunk: today → J+1 → J+3 → J+7 → mastered.
 *
 * - `discovered` (first encounter) and every success move one step forward.
 * - A failure resets the path: the chunk comes back tomorrow and must again be
 *   retrieved at J+1, J+3 and J+7.
 * - A difficult recall cannot complete the path: mastery needs an easy one.
 */
export function upsertChunkReview(
  state: AppState,
  chunkId: string,
  result: 'easy' | 'difficult' | 'failed' | 'discovered',
  now: Date = new Date(),
): AppState {
  const existing = state.chunkReviews.find((review) => review.chunkId === chunkId)
  const recalled = result === 'easy' || result === 'difficult' ? 1 : 0
  const previousStreak = existing?.streak ?? existing?.timesRecalled ?? 0

  let streak = result === 'failed' ? 0 : previousStreak + 1
  if (result === 'difficult' && streak >= 4) streak = 3

  let interval = 1
  let mastered = false
  if (streak === 2) interval = 2
  else if (streak === 3) interval = 4
  else if (streak >= 4) {
    interval = 30
    mastered = true
  }

  const next: ChunkReview = {
    chunkId,
    nextReview: nextReviewAfter(interval, now),
    interval,
    timesSeen: (existing?.timesSeen ?? 0) + 1,
    timesRecalled: (existing?.timesRecalled ?? 0) + recalled,
    streak,
    lastResult: result,
    mastered,
  }
  return {
    ...state,
    chunkReviews: [
      ...state.chunkReviews.filter((review) => review.chunkId !== chunkId),
      next,
    ],
  }
}

export function upsertWordGap(state: AppState, gap: WordGap): AppState {
  return {
    ...state,
    wordGaps: [...state.wordGaps.filter((existing) => existing.id !== gap.id), gap],
  }
}

export function applyGapResult(
  state: AppState,
  gapId: string,
  found: boolean,
  now: Date = new Date(),
): AppState {
  const existing = state.wordGaps.find((gap) => gap.id === gapId)
  if (!existing) return state
  const schedule = gapSchedule(existing.successCount, found, now)
  return upsertWordGap(state, {
    ...existing,
    successCount: schedule.successCount,
    nextReview: schedule.nextReview,
    status: schedule.mastered ? 'mastered' : 'learning',
  })
}

let gapCounter = 0
export function createWordGap(
  target: string,
  context: string,
  now: Date = new Date(),
): WordGap {
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

export function captureWordGap(
  state: AppState,
  target: string,
  context: string,
  now: Date = new Date(),
): AppState {
  const cleanTarget = target.trim()
  if (!cleanTarget) return state
  const existing = state.wordGaps.find(
    (gap) => gap.target.toLowerCase() === cleanTarget.toLowerCase(),
  )
  if (existing) {
    if (existing.context || !context.trim()) return state
    return upsertWordGap(state, { ...existing, context: context.trim() })
  }
  return upsertWordGap(state, createWordGap(cleanTarget, context, now))
}

let personalChunkCounter = 0
export function upsertPersonalChunk(
  state: AppState,
  expression: string,
  intent: string,
  now: Date = new Date(),
): AppState {
  const cleanExpression = expression.trim()
  if (!cleanExpression) return state
  const cleanIntent = intent.trim() || 'Réutiliser une expression personnelle'
  const existing = state.personalChunks.find(
    (chunk) => chunk.expression.toLowerCase() === cleanExpression.toLowerCase(),
  )
  if (existing) {
    const updated: PersonalChunk = {
      ...existing,
      intent: cleanIntent,
      nextReview: nextReviewAfter(1, now),
    }
    return {
      ...state,
      personalChunks: [
        ...state.personalChunks.filter((chunk) => chunk.id !== existing.id),
        updated,
      ],
    }
  }
  personalChunkCounter += 1
  const chunk: PersonalChunk = {
    id: `personal-chunk-${now.getTime()}-${personalChunkCounter}`,
    intent: cleanIntent,
    expression: cleanExpression,
    createdAt: toLocalDateString(now),
    nextReview: nextReviewAfter(1, now),
  }
  return { ...state, personalChunks: [...state.personalChunks, chunk] }
}

let noteCounter = 0
export function upsertFluencyNote(
  state: AppState,
  kind: FluencyNoteKind,
  text: string,
  now: Date = new Date(),
): AppState {
  const clean = text.trim()
  if (!clean) return state
  const existing = state.fluencyNotes.find(
    (note) => note.kind === kind && note.text.toLowerCase() === clean.toLowerCase(),
  )
  if (existing) {
    const updated: FluencyNote = {
      ...existing,
      nextReview: nextReviewAfter(1, now),
    }
    return {
      ...state,
      fluencyNotes: [
        ...state.fluencyNotes.filter((note) => note.id !== existing.id),
        updated,
      ],
    }
  }
  noteCounter += 1
  const note: FluencyNote = {
    id: `fluency-note-${now.getTime()}-${noteCounter}`,
    kind,
    text: clean,
    createdAt: toLocalDateString(now),
    nextReview: nextReviewAfter(1, now),
    timesSeen: 0,
  }
  return { ...state, fluencyNotes: [...state.fluencyNotes, note] }
}

export function markFluencyNoteUsed(
  state: AppState,
  noteId: string,
  now: Date = new Date(),
): AppState {
  const existing = state.fluencyNotes.find((note) => note.id === noteId)
  if (!existing) return state
  const timesSeen = existing.timesSeen + 1
  const interval = timesSeen === 1 ? 3 : timesSeen === 2 ? 7 : 30
  const updated: FluencyNote = {
    ...existing,
    timesSeen,
    nextReview: nextReviewAfter(interval, now),
  }
  return {
    ...state,
    fluencyNotes: [
      ...state.fluencyNotes.filter((note) => note.id !== noteId),
      updated,
    ],
  }
}
