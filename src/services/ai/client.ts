import { loadSettings } from '../settings/settings'
import { recordAiFailures, recordAiSuccess } from './stats'
import { recordingActivity } from '../audio/speechActivity'
import { computeFluencyMetrics, countWords } from './fluencyMetrics'
import type { FluencyMetrics, TimedWord } from './fluencyMetrics'

export { countFillers, countMarkers, countWords } from './fluencyMetrics'

/** Providers the server can use, in its default fallback order. */
export const AI_PROVIDERS: { id: string; label: string }[] = [
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'groq', label: 'Groq' },
  { id: 'mistral', label: 'Mistral' },
  { id: 'cloudflare', label: 'Cloudflare Workers AI' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'nvidia', label: 'NVIDIA' },
  { id: 'huggingface', label: 'Hugging Face' },
  { id: 'cohere', label: 'Cohere' },
]

export interface AiProviderStatus {
  id: string
  configured: boolean
  model: string
  transcribe: boolean
}

export interface AiStatus {
  providers: AiProviderStatus[]
}

function stringMap(value: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string') result[key] = item
    }
  }
  return result
}

export type AiErrorCode = 'disabled' | 'access' | 'unavailable' | 'network' | 'failed'

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    /** Providers the server tried without success. */
    readonly failed: string[] = [],
    /** Model each failed provider was asked to use. */
    readonly models: Record<string, string> = {},
  ) {
    super(code)
  }
}

const MESSAGES: Record<AiErrorCode, string> = {
  disabled: "L'IA est désactivée dans les paramètres.",
  access: "Le serveur d'IA refuse cette requête.",
  unavailable: "Aucun service d'IA n'est configuré sur le serveur.",
  network: "Impossible de joindre le serveur d'IA. Réessaie dans un instant.",
  failed: "Les services d'IA n'ont pas répondu. Réessaie dans un instant.",
}

export function aiErrorMessage(error: unknown): string {
  return MESSAGES[error instanceof AiError ? error.code : 'failed']
}

/**
 * Read at call time, not captured: switching the master switch off takes
 * effect immediately, even for a screen that is already open.
 */
function currentSettings() {
  return loadSettings()
}

export function isAiEnabled(): boolean {
  return currentSettings().aiEnabled
}

function requireEnabled() {
  if (!isAiEnabled()) throw new AiError('disabled')
}

function providersParam(): string[] | undefined {
  const { aiProvider } = currentSettings()
  return aiProvider === 'auto' ? undefined : [aiProvider]
}

async function send(path: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(`${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`, init)
  } catch {
    throw new AiError('network')
  }
  if (response.status === 401) throw new AiError('access')
  if (response.status === 503) throw new AiError('unavailable')
  if (response.status === 404) throw new AiError('network')
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      failed?: unknown
      models?: unknown
    } | null
    const failed = Array.isArray(body?.failed) ? body.failed.map(String) : []
    throw new AiError('failed', failed, stringMap(body?.models))
  }
  return response
}

export async function fetchAiStatus(): Promise<AiStatus> {
  requireEnabled()
  const response = await send('api/status', {})
  return (await response.json()) as AiStatus
}

export type AiTask =
  | 'analyze-fluency'
  | 'compare-432'
  | 'judge-word'
  | 'question'
  | 'roleplay'
  | 'transfer-topic'

/** Tasks whose answer only depends on the input (temperature 0): asked once per visit. */
const CACHED_TASKS: ReadonlySet<AiTask> = new Set(['judge-word'])
const taskCache = new Map<string, { data: unknown; provider: string }>()

export async function runAiTask<T>(
  task: AiTask,
  input: unknown,
): Promise<{ data: T; provider: string }> {
  requireEnabled()
  const cacheKey = CACHED_TASKS.has(task) ? `${task}:${JSON.stringify(input)}` : null
  const cached = cacheKey ? taskCache.get(cacheKey) : undefined
  if (cached) return cached as { data: T; provider: string }
  let response: Response
  try {
    response = await send('api/task', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task, input, providers: providersParam() }),
    })
  } catch (caught) {
    if (caught instanceof AiError) recordAiFailures(caught.failed, 'text', caught.models)
    throw caught
  }
  const result = (await response.json()) as {
    data: T
    provider: string
    model: string
    usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null
    latencyMs: number
    failed: string[]
    models?: Record<string, string>
  }
  recordAiSuccess({
    provider: result.provider,
    kind: 'text',
    model: result.model,
    ...result.usage,
    latencyMs: result.latencyMs,
    failed: result.failed,
    models: result.models,
  })
  if (cacheKey) taskCache.set(cacheKey, { data: result.data, provider: result.provider })
  return { data: result.data, provider: result.provider }
}

export interface Transcript {
  text: string
  provider: string
  /** Word timestamps, when the provider gives them (Whisper). */
  words?: TimedWord[]
}

/**
 * Transcripts by blob URL: a round analysed alone, then compared with the
 * others, is sent to the server once. A failure is not kept.
 */
const transcriptCache = new Map<string, Promise<Transcript>>()

/** Transcribes an in-memory recording (a blob: URL from the recorder). */
export function transcribeAudio(audioUrl: string): Promise<Transcript> {
  const cached = transcriptCache.get(audioUrl)
  if (cached) return cached
  const pending = fetchTranscript(audioUrl)
  transcriptCache.set(audioUrl, pending)
  pending.catch(() => transcriptCache.delete(audioUrl))
  return pending
}

async function fetchTranscript(audioUrl: string): Promise<Transcript> {
  requireEnabled()
  let blob: Blob
  try {
    blob = await (await fetch(audioUrl)).blob()
  } catch {
    throw new AiError('failed')
  }
  const form = new FormData()
  form.append('file', blob, 'audio.webm')
  const providers = providersParam()
  if (providers) form.append('providers', providers.join(','))
  let response: Response
  try {
    response = await send('api/transcribe', { method: 'POST', body: form })
  } catch (caught) {
    if (caught instanceof AiError) recordAiFailures(caught.failed, 'audio', caught.models)
    throw caught
  }
  const result = (await response.json()) as {
    text: string
    words?: TimedWord[]
    provider: string
    model: string
    audioBytes: number
    latencyMs: number
    failed: string[]
    models?: Record<string, string>
  }
  recordAiSuccess({
    provider: result.provider,
    kind: 'audio',
    model: result.model,
    audioBytes: result.audioBytes,
    words: countWords(result.text),
    latencyMs: result.latencyMs,
    failed: result.failed,
    models: result.models,
  })
  return Array.isArray(result.words) && result.words.length > 0
    ? { text: result.text, provider: result.provider, words: result.words }
    : { text: result.text, provider: result.provider }
}

export interface WordVerdict {
  verdict: 'exact' | 'acceptable' | 'faux'
  comment: string
}

export type BlockageType =
  | 'missing_word'
  | 'sentence_restart'
  | 'idea_block'
  | 'grammar_planning'
  | 'excessive_filler'
  | 'uncertain'

/** Fluency coaching on one recording: where it blocks, why, how to keep going. */
export interface FluencyAnalysis {
  summary: string
  blockages: { evidence: string; type: BlockageType; strategy: string }[]
  /** Words that seem to have been missing, with the idea to retrieve them from. */
  missingWords: { word: string; idea: string }[]
  /** Chunks to reuse to keep speaking. */
  strategies: { chunk: string; use: string }[]
  /** Only the errors that hinder understanding, keep coming back or block the flow. */
  corrections: { said: string; better: string }[]
  microExercise: string
}

export type SpeechSituation = 'round' | 'question' | 'final' | 'coach' | 'conversation'

/** The measures of a recording: its transcript, its word timestamps and its microphone levels. */
export async function recordingMetrics(
  audioUrl: string,
): Promise<{ transcript: Transcript; metrics: FluencyMetrics }> {
  const transcript = await transcribeAudio(audioUrl)
  const metrics = computeFluencyMetrics({
    transcript: transcript.text,
    words: transcript.words,
    activity: recordingActivity(audioUrl),
  })
  return { transcript, metrics }
}

/** Transcribes a recording, measures it, then asks for fluency coaching. */
export async function analyzeRecording(
  audioUrl: string,
  situation: SpeechSituation = 'round',
): Promise<{ transcript: string; metrics: FluencyMetrics | null; analysis: FluencyAnalysis | null }> {
  const { transcript, metrics } = await recordingMetrics(audioUrl)
  if (countWords(transcript.text) < 4) return { transcript: transcript.text, metrics: null, analysis: null }
  const { data } = await runAiTask<Partial<FluencyAnalysis>>('analyze-fluency', {
    transcript: transcript.text,
    situation,
    metrics,
  })
  // An answer from an older server, or missing a list, still renders.
  const analysis: FluencyAnalysis = {
    summary: data?.summary ?? '',
    blockages: data?.blockages ?? [],
    missingWords: data?.missingWords ?? [],
    strategies: data?.strategies ?? [],
    corrections: data?.corrections ?? [],
    microExercise: data?.microExercise ?? '',
  }
  return { transcript: transcript.text, metrics, analysis }
}

export type Trend = 'better' | 'same' | 'worse' | 'unknown'

/** How the rounds of a 4 → 3 → 2 evolved, and the one thing to do next time. */
export interface RoundsComparison {
  summary: string
  hesitations: Trend
  restarts: Trend
  continuity: Trend
  contentKept: Trend
  recited: boolean
  observations: string[]
  transfer: string
  priority: string
}

export async function compareRoundRecordings(input: {
  topic: string
  transferTopic?: string
  rounds: { label: string; audioUrl: string; transfer?: boolean }[]
}): Promise<RoundsComparison> {
  const rounds = []
  for (const round of input.rounds) {
    const { transcript, metrics } = await recordingMetrics(round.audioUrl)
    if (countWords(transcript.text) < 4) continue
    rounds.push({ label: round.label, transcript: transcript.text, metrics, transfer: Boolean(round.transfer) })
  }
  if (rounds.filter((round) => !round.transfer).length < 2) throw new AiError('failed')
  const { data } = await runAiTask<RoundsComparison>('compare-432', {
    topic: input.topic,
    transferTopic: input.transferTopic ?? '',
    rounds,
  })
  return data
}

/**
 * Lexical diversity on the first `size` words: distinct words ÷ `size`. The
 * ratio depends on the length of the text, so it is always measured on the
 * same number of words; null when the transcript is shorter.
 */
export function typeTokenRatio(text: string, size = 200): number | null {
  const words = text
    .toLowerCase()
    .split(/[^\p{L}'-]+/u)
    .filter(Boolean)
  if (words.length < size) return null
  return Math.round((new Set(words.slice(0, size)).size / size) * 100) / 100
}
