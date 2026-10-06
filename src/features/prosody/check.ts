import { finalMovement, pitchOfRecording, pitchRange } from '../../services/audio/pitch'
import { analyzeSpeechActivity } from '../../services/audio/speechActivity'
import checkData from '../../data/prosody-check.json'

export type ProsodyCheckKind = 'S0' | 'S4' | 'S8'

export type CheckItemKind = 'imitation' | 'reading' | 'story' | 'argument'

export interface CheckMeasures {
  /** Pauses of 250 ms or more. */
  pauses250?: number
  meanPauseSeconds?: number
  /** Pitch range in semitones (10th–90th percentile): how flat the voice is. */
  pitchRange?: number
  finalMovement?: 'rise' | 'fall' | 'level' | null
}

export interface CheckItem {
  id: string
  kind: CheckItemKind
  prompt: string
  audioId: string
  measures: CheckMeasures | null
}

export interface ProsodyCheckRecord {
  id: string
  kind: ProsodyCheckKind
  date: string
  items: CheckItem[]
}

export interface BlindRating {
  comprehensibility: number
  accent: number
  naturalness: number
}

export const CHECK_PROMPTS = checkData as unknown as {
  phrases: string[]
  readingText: string
  storyPrompt: string
  argumentPrompt: string
}

/** The next bilan to run: S0, then S4, then S8 (each at most once). */
export function nextCheckKind(done: readonly ProsodyCheckKind[]): ProsodyCheckKind | null {
  if (!done.includes('S0')) return 'S0'
  if (!done.includes('S4')) return 'S4'
  if (!done.includes('S8')) return 'S8'
  return null
}

/** S4 comes 4 weeks after S0, S8 8 weeks after S0. */
export const CHECK_DELAY_DAYS: Record<ProsodyCheckKind, number> = { S0: 0, S4: 28, S8: 56 }

export interface CheckStatus {
  /** `due`: run it now; `wait`: not yet; `done`: all three are recorded. */
  state: 'due' | 'wait' | 'done'
  kind: ProsodyCheckKind | null
  /** Local date (YYYY-MM-DD) from which the next bilan can be run. */
  availableOn: string | null
}

const DAY_MS = 86_400_000

function localDate(time: number): string {
  const date = new Date(time)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Which bilan to run now. S4 and S8 are only offered once their interval since
 * S0 has passed: running all three on the same day would void the four- and
 * eight-week comparison.
 */
export function checkStatus(
  records: ReadonlyArray<Pick<ProsodyCheckRecord, 'kind' | 'date'>>,
  now: Date = new Date(),
): CheckStatus {
  const kind = nextCheckKind(records.map((record) => record.kind))
  if (kind === null) return { state: 'done', kind: null, availableOn: null }
  if (kind === 'S0') return { state: 'due', kind, availableOn: null }
  const first = records.find((record) => record.kind === 'S0')
  const start = first ? new Date(first.date).getTime() : NaN
  if (Number.isNaN(start)) return { state: 'due', kind, availableOn: null }
  const availableAt = start + CHECK_DELAY_DAYS[kind] * DAY_MS
  const availableOn = localDate(availableAt)
  return localDate(now.getTime()) >= availableOn
    ? { state: 'due', kind, availableOn }
    : { state: 'wait', kind, availableOn }
}

/** Decodes the recording and measures pauses (≥ 250 ms) and the pitch shape. */
export async function measureRecording(url: string): Promise<CheckMeasures | null> {
  const [activity, pitch] = await Promise.all([
    activityOfRecording(url),
    pitchOfRecording(url),
  ])
  if (!activity && !pitch) return null
  return {
    pauses250: activity?.shortPauses,
    meanPauseSeconds: activity?.meanPauseSeconds,
    pitchRange: pitch ? pitchRange(pitch.semitones) ?? undefined : undefined,
    finalMovement: pitch ? finalMovement(pitch.semitones) : null,
  }
}

/** RMS levels per frame, decoded from the recording, then analysed for pauses. */
async function activityOfRecording(
  url: string,
  frameSeconds = 0.05,
): Promise<ReturnType<typeof analyzeSpeechActivity>> {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Context) return null
    const context = new Context()
    try {
      const data = await (await fetch(url)).arrayBuffer()
      const buffer = await context.decodeAudioData(data)
      const samples = buffer.getChannelData(0)
      const frame = Math.max(1, Math.round(frameSeconds * buffer.sampleRate))
      const levels: number[] = []
      for (let start = 0; start < samples.length; start += frame) {
        const end = Math.min(samples.length, start + frame)
        let sum = 0
        for (let i = start; i < end; i += 1) sum += samples[i] * samples[i]
        levels.push(Math.sqrt(sum / (end - start)))
      }
      return analyzeSpeechActivity(levels, { frameSeconds })
    } finally {
      void context.close()
    }
  } catch {
    return null
  }
}

/** A rating given by one person (the learner, or a native who listens) to one recording. */
export interface StoredRating extends BlindRating {
  rater: string
  itemId: string
}

export const DEFAULT_RATER = 'Moi'

export function ratingKey(rater: string, itemId: string): string {
  return `rating-${rater.trim() || DEFAULT_RATER}::${itemId}`
}

/**
 * Reads a stored rating. Ratings saved before raters existed (key
 * `rating-<itemId>`, no name) count as the learner's own.
 */
export function parseStoredRating(key: string, value: Partial<StoredRating>): StoredRating | null {
  const { comprehensibility, accent, naturalness } = value
  if (
    typeof comprehensibility !== 'number' ||
    typeof accent !== 'number' ||
    typeof naturalness !== 'number'
  ) {
    return null
  }
  const body = key.replace(/^rating-/, '')
  const [rater, itemId] = body.includes('::') ? body.split('::') : [DEFAULT_RATER, body]
  return {
    rater: value.rater ?? rater,
    itemId: value.itemId ?? itemId,
    comprehensibility,
    accent,
    naturalness,
  }
}

export interface RatingSummaryRow {
  rater: string
  kind: ProsodyCheckKind
  count: number
  comprehensibility: number
  accent: number
  naturalness: number
}

const mean = (values: number[]) => Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10

/**
 * Mean score per rater and per bilan (S0, S4, S8), on the spontaneous
 * recordings only (story and argument): that is where gains are least sure.
 * The bilans are only named here, after the blind rating is over.
 */
export function summarizeRatings(
  records: readonly ProsodyCheckRecord[],
  ratings: readonly StoredRating[],
): RatingSummaryRow[] {
  const owner = new Map<string, { kind: ProsodyCheckKind; item: CheckItem }>()
  for (const record of records) for (const item of record.items) owner.set(item.id, { kind: record.kind, item })

  const groups = new Map<string, StoredRating[]>()
  for (const rating of ratings) {
    const found = owner.get(rating.itemId)
    if (!found || (found.item.kind !== 'story' && found.item.kind !== 'argument')) continue
    const key = `${rating.rater}||${found.kind}`
    groups.set(key, [...(groups.get(key) ?? []), rating])
  }
  const order: ProsodyCheckKind[] = ['S0', 'S4', 'S8']
  return [...groups.entries()]
    .map(([key, list]) => {
      const [rater, kind] = key.split('||') as [string, ProsodyCheckKind]
      return {
        rater,
        kind,
        count: list.length,
        comprehensibility: mean(list.map((rating) => rating.comprehensibility)),
        accent: mean(list.map((rating) => rating.accent)),
        naturalness: mean(list.map((rating) => rating.naturalness)),
      }
    })
    .sort((a, b) => a.rater.localeCompare(b.rater) || order.indexOf(a.kind) - order.indexOf(b.kind))
}

/** One line per rating, to open in a spreadsheet or hand to a native. */
export function ratingsToCsv(
  records: readonly ProsodyCheckRecord[],
  ratings: readonly StoredRating[],
): string {
  const owner = new Map<string, { kind: ProsodyCheckKind; date: string; item: CheckItem }>()
  for (const record of records) {
    for (const item of record.items) owner.set(item.id, { kind: record.kind, date: record.date, item })
  }
  const cell = (value: string | number | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const header = ['rater', 'bilan', 'date', 'recording', 'comprehensibility', 'accent', 'naturalness']
  const rows = ratings.map((rating) => {
    const found = owner.get(rating.itemId)
    return [
      rating.rater,
      found?.kind,
      found?.date,
      found?.item.kind,
      rating.comprehensibility,
      rating.accent,
      rating.naturalness,
    ]
      .map(cell)
      .join(',')
  })
  return [header.join(','), ...rows].join('\n')
}
