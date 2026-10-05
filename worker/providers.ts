import { MODEL_CATALOG, type ModelSpec } from './models'

export type ProviderId =
  | 'gemini'
  | 'groq'
  | 'mistral'
  | 'cloudflare'
  | 'openrouter'
  | 'nvidia'
  | 'huggingface'
  | 'cohere'

/** Default fallback order: the most generous free tiers first. */
export const PROVIDER_IDS: readonly ProviderId[] = [
  'gemini',
  'groq',
  'mistral',
  'cloudflare',
  'openrouter',
  'nvidia',
  'huggingface',
  'cohere',
]

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Minimal shape of the Workers AI binding (avoids a types dependency). */
export interface AiBinding {
  run(model: string, input: unknown): Promise<unknown>
}

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
  AI?: AiBinding
  GEMINI_API_KEY?: string
  GROQ_API_KEY?: string
  MISTRAL_API_KEY?: string
  OPENROUTER_API_KEY?: string
  NVIDIA_API_KEY?: string
  COHERE_API_KEY?: string
  HF_TOKEN?: string
  /** Older name for HF_TOKEN. */
  HUGGINGFACE_API_KEY?: string
  /** Workers AI over REST, when the binding is not available. */
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_AI_API_TOKEN?: string
  /** Optional overrides, e.g. GROQ_MODEL. */
  GEMINI_MODEL?: string
  GROQ_MODEL?: string
  MISTRAL_MODEL?: string
  CLOUDFLARE_MODEL?: string
  OPENROUTER_MODEL?: string
  NVIDIA_MODEL?: string
  HUGGINGFACE_MODEL?: string
  COHERE_MODEL?: string
  /** Optional overrides for transcription models. */
  GEMINI_TRANSCRIBE_MODEL?: string
  GROQ_TRANSCRIBE_MODEL?: string
  MISTRAL_TRANSCRIBE_MODEL?: string
  CLOUDFLARE_TRANSCRIBE_MODEL?: string
  /** Optional comma-separated fallback order, e.g. "gemini,groq,cloudflare". */
  PROVIDER_ORDER?: string
  /** When set, every /api request must carry it in the x-access-code header. */
  AI_ACCESS_CODE?: string
}

export interface Usage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ChatResult {
  provider: ProviderId
  model: string
  text: string
  usage: Usage | null
}

interface Completion {
  text: string
  usage: Usage | null
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/** Token counts as reported by the provider, whatever their field names. */
function toUsage(raw: unknown, names: [string, string, string]): Usage | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const promptTokens = num(data[names[0]])
  const completionTokens = num(data[names[1]])
  const totalTokens = num(data[names[2]]) || promptTokens + completionTokens
  return totalTokens > 0 ? { promptTokens, completionTokens, totalTokens } : null
}

/** OpenAI-compatible chat endpoints, with the secret holding their key. */
const OPENAI_COMPATIBLE: Partial<
  Record<ProviderId, { url: string; key: (env: Env) => string | undefined; headers?: Record<string, string> }>
> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: (env) => env.GROQ_API_KEY,
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: (env) => env.MISTRAL_API_KEY,
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: (env) => env.OPENROUTER_API_KEY,
    headers: { 'x-title': 'Parle+' },
  },
  nvidia: {
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    key: (env) => env.NVIDIA_API_KEY,
  },
  huggingface: {
    url: 'https://router.huggingface.co/v1/chat/completions',
    key: (env) => env.HF_TOKEN ?? env.HUGGINGFACE_API_KEY,
  },
  cohere: {
    url: 'https://api.cohere.ai/compatibility/v1/chat/completions',
    key: (env) => env.COHERE_API_KEY,
  },
}

const MODEL_VARS: Record<ProviderId, keyof Env> = {
  gemini: 'GEMINI_MODEL',
  groq: 'GROQ_MODEL',
  mistral: 'MISTRAL_MODEL',
  cloudflare: 'CLOUDFLARE_MODEL',
  openrouter: 'OPENROUTER_MODEL',
  nvidia: 'NVIDIA_MODEL',
  huggingface: 'HUGGINGFACE_MODEL',
  cohere: 'COHERE_MODEL',
}

/** Models to try for a provider, in order: the *_MODEL override first, then the catalog. */
export function modelsFor(provider: ProviderId, env: Env): ModelSpec[] {
  const catalog = MODEL_CATALOG[provider]
  const override = env[MODEL_VARS[provider]]
  if (typeof override !== 'string' || !override.trim()) return catalog
  const id = override.trim()
  const known = catalog.find((spec) => spec.id === id)
  return [known ?? { id }, ...catalog.filter((spec) => spec.id !== id)]
}

/** The model a provider uses first. */
export function modelFor(provider: ProviderId, env: Env): string {
  return modelsFor(provider, env)[0].id
}

/** Workers AI is reachable through the binding, or over REST with a token. */
export function cloudflareRest(env: Env): { account: string; token: string } | null {
  return env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_AI_API_TOKEN
    ? { account: env.CLOUDFLARE_ACCOUNT_ID, token: env.CLOUDFLARE_AI_API_TOKEN }
    : null
}

export function isConfigured(provider: ProviderId, env: Env): boolean {
  if (provider === 'gemini') return Boolean(env.GEMINI_API_KEY)
  if (provider === 'cloudflare') return Boolean(env.AI || cloudflareRest(env))
  return Boolean(OPENAI_COMPATIBLE[provider]?.key(env))
}

export function parseProviderList(raw: unknown): ProviderId[] {
  const items = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? raw.split(',')
      : []
  const result: ProviderId[] = []
  for (const item of items) {
    const id = String(item).trim().toLowerCase() as ProviderId
    if (PROVIDER_IDS.includes(id) && !result.includes(id)) result.push(id)
  }
  return result
}

/** Requested order > PROVIDER_ORDER var > built-in order; only configured ones. */
export function resolveOrder(
  requested: unknown,
  env: Env,
  allowed: readonly ProviderId[] = PROVIDER_IDS,
): ProviderId[] {
  const asked = parseProviderList(requested)
  const configured = parseProviderList(env.PROVIDER_ORDER)
  const base = asked.length ? asked : configured.length ? configured : [...PROVIDER_IDS]
  return base.filter((id) => allowed.includes(id) && isConfigured(id, env))
}

/** A failed call, with what the provider said (shown by /api/diagnose). */
export class ProviderError extends Error {
  constructor(
    readonly status: number,
    detail: string,
  ) {
    super(status ? `HTTP ${status}: ${detail}` : detail)
  }
}

async function httpError(response: Response): Promise<ProviderError> {
  const body = await response.text().catch(() => '')
  return new ProviderError(response.status, body.replace(/\s+/g, ' ').slice(0, 300))
}

async function openAiCompatible(
  provider: ProviderId,
  env: Env,
  spec: ModelSpec,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<Completion> {
  const endpoint = OPENAI_COMPATIBLE[provider]
  const key = endpoint?.key(env)
  if (!endpoint || !key) throw new ProviderError(0, 'not configured')
  const response = await fetch(endpoint.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
      ...endpoint.headers,
    },
    body: JSON.stringify({
      model: spec.id,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...spec.extra,
    }),
  })
  if (!response.ok) throw await httpError(response)
  const data = (await response.json()) as {
    choices?: { message?: { content?: string | null; reasoning?: string }; finish_reason?: string }[]
    usage?: unknown
  }
  const choice = data.choices?.[0]
  const text = choice?.message?.content
  if (typeof text !== 'string' || !text.trim()) {
    const why = choice?.message?.reasoning ? 'only reasoning, no answer' : 'empty answer'
    throw new ProviderError(0, `${why} (finish_reason: ${choice?.finish_reason ?? '?'})`)
  }
  return { text, usage: toUsage(data.usage, ['prompt_tokens', 'completion_tokens', 'total_tokens']) }
}

async function callGemini(
  key: string,
  spec: ModelSpec,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<Completion> {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(spec.id)}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents,
        ...(system.length
          ? { systemInstruction: { parts: [{ text: system.join('\n') }] } }
          : {}),
        // Model-specific settings (e.g. thinking level) go into generationConfig.
        generationConfig: { maxOutputTokens: maxTokens, temperature, ...spec.extra },
      }),
    },
  )
  if (!response.ok) throw await httpError(response)
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]
    usageMetadata?: unknown
  }
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
  if (!text?.trim()) {
    throw new ProviderError(0, `empty answer (finishReason: ${data.candidates?.[0]?.finishReason ?? '?'})`)
  }
  return {
    text,
    usage: toUsage(data.usageMetadata, [
      'promptTokenCount',
      'candidatesTokenCount',
      'totalTokenCount',
    ]),
  }
}

/** Runs a Workers AI model through the binding, or over REST when there is none. */
export async function runCloudflare(env: Env, model: string, input: unknown): Promise<unknown> {
  if (env.AI) return env.AI.run(model, input)
  const rest = cloudflareRest(env)
  if (!rest) throw new ProviderError(0, 'not configured')
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${rest.account}/ai/run/${model}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${rest.token}` },
      body: JSON.stringify(input),
    },
  )
  if (!response.ok) throw await httpError(response)
  const data = (await response.json()) as { result?: unknown }
  return data.result
}

async function callCloudflare(
  env: Env,
  spec: ModelSpec,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<Completion> {
  const data = (await runCloudflare(env, spec.id, {
    messages,
    max_tokens: maxTokens,
    temperature,
    ...spec.extra,
  })) as {
    response?: unknown
    choices?: { message?: { content?: string | null } }[]
    usage?: unknown
  } | null
  // Most models answer { response }, OpenAI-style ones answer { choices }.
  const raw = data?.response ?? data?.choices?.[0]?.message?.content
  const text = typeof raw === 'string' ? raw : raw && typeof raw === 'object' ? JSON.stringify(raw) : ''
  if (!text.trim()) throw new ProviderError(0, 'empty answer')
  return { text, usage: toUsage(data?.usage, ['prompt_tokens', 'completion_tokens', 'total_tokens']) }
}

export interface ChatOptions {
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
}

/** Calls one model of one provider. */
export async function callModel(
  provider: ProviderId,
  spec: ModelSpec,
  env: Env,
  { messages, maxTokens = 700, temperature = 0.4 }: ChatOptions,
): Promise<ChatResult> {
  const tokens = Math.max(maxTokens, spec.minTokens ?? 0)
  let completion: Completion
  try {
    if (provider === 'gemini') {
      completion = await callGemini(env.GEMINI_API_KEY as string, spec, messages, tokens, temperature)
    } else if (provider === 'cloudflare') {
      completion = await callCloudflare(env, spec, messages, tokens, temperature)
    } else {
      completion = await openAiCompatible(provider, env, spec, messages, tokens, temperature)
    }
  } catch (error) {
    if (error instanceof ProviderError) throw error
    throw new ProviderError(0, error instanceof Error ? error.message : String(error))
  }
  return { provider, model: spec.id, ...completion }
}

/**
 * Providers and models that just failed are skipped for a while, so one broken
 * provider does not cost a wasted request on every call. Kept per Worker isolate.
 */
const downUntil = new Map<string, number>()

export function isDown(key: string, now: number): boolean {
  const until = downUntil.get(key)
  if (until === undefined) return false
  if (until > now) return true
  downUntil.delete(key)
  return false
}

const MINUTE = 60_000

export function markFailure(provider: ProviderId, model: string, error: unknown, now: number) {
  const status = error instanceof ProviderError ? error.status : 0
  if (status === 401 || status === 402 || status === 403) {
    downUntil.set(provider, now + 30 * MINUTE) // key or account problem
  } else if (status === 429) {
    downUntil.set(provider, now + MINUTE) // rate limited: try again soon
  } else if (status === 400 || status === 404 || status === 410 || status === 422) {
    downUntil.set(`${provider}|${model}`, now + 6 * 60 * MINUTE) // model gone or refused
  } else {
    downUntil.set(`${provider}|${model}`, now + 2 * MINUTE)
  }
}

/** Forgets every failure (tests, diagnostics). */
export function resetFailures() {
  downUntil.clear()
}

export interface Attempt {
  provider: ProviderId
  model: string
  error: string
}

/** Tries each provider's first available model, and the next ones when it fails. */
export async function callProvider(
  provider: ProviderId,
  env: Env,
  options: ChatOptions,
  attempts: Attempt[] = [],
  ignoreFailures = false,
): Promise<ChatResult | null> {
  const now = Date.now()
  if (!ignoreFailures && isDown(provider, now)) return null
  for (const spec of modelsFor(provider, env)) {
    if (!ignoreFailures && isDown(`${provider}|${spec.id}`, now)) continue
    try {
      return await callModel(provider, spec, env, options)
    } catch (error) {
      attempts.push({ provider, model: spec.id, error: String((error as Error).message ?? error) })
      markFailure(provider, spec.id, error, now)
      // The whole provider is down: its other models would fail the same way.
      if (isDown(provider, now)) return null
    }
  }
  return null
}

/** Tries each provider in order and returns the first success. */
export async function chatWithFallback(
  order: ProviderId[],
  env: Env,
  options: ChatOptions,
): Promise<{ result: ChatResult | null; failed: ProviderId[]; attempts: Attempt[] }> {
  const attempts: Attempt[] = []
  for (const provider of order) {
    const result = await callProvider(provider, env, options, attempts)
    if (result) return { result, failed: failedProviders(attempts), attempts }
  }
  // Everything was skipped as recently failed: give the first provider one real try.
  if (attempts.length === 0 && order.length > 0) {
    const result = await callProvider(order[0], env, options, attempts, true)
    if (result) return { result, failed: failedProviders(attempts), attempts }
  }
  return { result: null, failed: failedProviders(attempts), attempts }
}

function failedProviders(attempts: Attempt[]): ProviderId[] {
  return [...new Set(attempts.map((attempt) => attempt.provider))]
}
