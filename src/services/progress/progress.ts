import { RECENT_WINDOWS, WEEKLY_GOAL } from '../../types/progress'
import type {
  AppState,
  ChunkReview,
  ConversationPractice,
  FluencyNote,
  FluencyNoteKind,
  PersonalChunk,
  PersonalExample,
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
    level: trainingLevelForSessionCount(sessions.length),
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

export function calculateProsodyMinutes(
  sessions: readonly ProsodySessionRecord[],
): number {
  return sessions.reduce(
    (total, session) => total + (session.durationMinutes || 0),
    0,
  )
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
  const existing = state.chunkReviews.find((review) => review.chunkId === chunkId)
  const recalled = result === 'failed' ? 0 : 1
  const nextTimesRecalled = (existing?.timesRecalled ?? 0) + recalled

  let interval = 1
  let mastered = false
  if (result !== 'failed') {
    if (nextTimesRecalled === 1) interval = 1
    else if (nextTimesRecalled === 2) interval = 2
    else if (nextTimesRecalled === 3) interval = 4
    else {
      interval = 30
      mastered = true
    }
  }

  const next: ChunkReview = {
    chunkId,
    nextReview: nextReviewAfter(interval, now),
    interval,
    timesSeen: (existing?.timesSeen ?? 0) + 1,
    timesRecalled: nextTimesRecalled,
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
