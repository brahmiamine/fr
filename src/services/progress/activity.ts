import type { ProsodySessionRecord, SessionRecord } from '../../types/progress'
import { getWeekKey, toLocalDateString } from './progress'

type Dated = Pick<SessionRecord | ProsodySessionRecord, 'date' | 'durationMinutes'>

export const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Local dates of the current week, Monday first. */
export function currentWeekDates(today: Date = new Date()): string[] {
  const monday = parseLocalDate(getWeekKey(today))
  return Array.from({ length: 7 }, (_, index) => toLocalDateString(shiftDays(monday, index)))
}

function minutesByDate(records: readonly Dated[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const record of records) {
    totals.set(record.date, (totals.get(record.date) ?? 0) + (record.durationMinutes || 0))
  }
  return totals
}

/** Whether a guided session was completed on each day of the current week. */
export function practicedWeekDays(
  sessions: readonly SessionRecord[],
  today: Date = new Date(),
): boolean[] {
  const dates = new Set(sessions.map((session) => session.date))
  return currentWeekDates(today).map((date) => dates.has(date))
}

/** Practice minutes (sessions + prosody) on each day of the current week. */
export function minutesByWeekDay(
  records: readonly Dated[],
  today: Date = new Date(),
): number[] {
  const totals = minutesByDate(records)
  return currentWeekDates(today).map((date) => totals.get(date) ?? 0)
}

export interface HeatmapDay {
  date: string
  minutes: number
  /** 0 = nothing, 1–3 = intensity; null for days still to come. */
  level: 0 | 1 | 2 | 3 | null
}

function intensity(minutes: number): 0 | 1 | 2 | 3 {
  if (minutes <= 0) return 0
  if (minutes < 15) return 1
  if (minutes < 30) return 2
  return 3
}

/** Days of the last `weeks` weeks, column by column (Monday → Sunday). */
export function activityHeatmap(
  records: readonly Dated[],
  today: Date = new Date(),
  weeks = 12,
): HeatmapDay[] {
  const totals = minutesByDate(records)
  const todayString = toLocalDateString(today)
  const firstMonday = shiftDays(parseLocalDate(getWeekKey(today)), -7 * (weeks - 1))
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = toLocalDateString(shiftDays(firstMonday, index))
    const minutes = totals.get(date) ?? 0
    return { date, minutes, level: date > todayString ? null : intensity(minutes) }
  })
}
