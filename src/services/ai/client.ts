import { loadSettings } from '../settings/settings'
import { recordAiFailures, recordAiSuccess } from './stats'

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
  | 'analyze-speech'
  | 'judge-word'
  | 'question'
  | 'roleplay'
  | 'transfer-topic'

export async function runAiTask<T>(
  task: AiTask,
  input: unknown,
): Promise<{ data: T; provider: string }> {
  requireEnabled()
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
  return { data: result.data, provider: result.provider }
}

/** Transcribes an in-memory recording (a blob: URL from the recorder). */
export async function transcribeAudio(
  audioUrl: string,
): Promise<{ text: string; provider: string }> {
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
  return { text: result.text, provider: result.provider }
}

export interface SpeechAnalysis {
  summary: string
  corrections: { said: string; better: string }[]
  expressions: { expression: string; intent: string }[]
  blockedWord: { word: string; idea: string } | null
}

export interface WordVerdict {
  verdict: 'exact' | 'acceptable' | 'faux'
  comment: string
}

/** Transcribes a recording, then asks for coaching on what was said. */
export async function analyzeRecording(
  audioUrl: string,
): Promise<{ transcript: string; analysis: SpeechAnalysis | null }> {
  const { text } = await transcribeAudio(audioUrl)
  if (countWords(text) < 4) return { transcript: text, analysis: null }
  const { data } = await runAiTask<SpeechAnalysis>('analyze-speech', { transcript: text })
  return { transcript: text, analysis: data }
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

const FILLER = /(?:^|[^\p{L}])(?:euh+|heu+|hum+|hmm+|mmh+|ben|bah|bof)(?=$|[^\p{L}])/giu

/** Spoken hesitations ("euh", "hum", "ben"…) found in a transcript. */
export function countFillers(text: string): number {
  return text.match(FILLER)?.length ?? 0
}
