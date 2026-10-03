export type ProviderId =
  | 'gemini'
  | 'groq'
  | 'mistral'
  | 'cerebras'
  | 'cloudflare'
  | 'openrouter'
  | 'nvidia'
  | 'huggingface'
  | 'cohere'
  | 'gateway'

/** Default fallback order: the most generous free tiers first. */
export const PROVIDER_IDS: readonly ProviderId[] = [
  'gemini',
  'groq',
  'mistral',
  'cerebras',
  'cloudflare',
  'openrouter',
  'nvidia',
  'huggingface',
  'cohere',
  'gateway',
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
  CEREBRAS_API_KEY?: string
  OPENROUTER_API_KEY?: string
  NVIDIA_API_KEY?: string
  COHERE_API_KEY?: string
  /** Vercel AI Gateway. */
  AI_GATEWAY_API_KEY?: string
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
  CEREBRAS_MODEL?: string
  CLOUDFLARE_MODEL?: string
  OPENROUTER_MODEL?: string
  NVIDIA_MODEL?: string
  HUGGINGFACE_MODEL?: string
  COHERE_MODEL?: string
  GATEWAY_MODEL?: string
  /** Optional comma-separated fallback order, e.g. "gemini,groq,cloudflare". */
  PROVIDER_ORDER?: string
  /** When set, every /api request must carry it in the x-access-code header. */
  AI_ACCESS_CODE?: string
}

export interface ChatResult {
  provider: ProviderId
  model: string
  text: string
}

const DEFAULT_MODELS: Record<ProviderId, string> = {
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  mistral: 'mistral-small-latest',
  cerebras: 'llama3.1-8b',
  cloudflare: '@cf/meta/llama-3.1-8b-instruct',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  nvidia: 'meta/llama-3.3-70b-instruct',
  huggingface: 'meta-llama/Llama-3.3-70B-Instruct',
  cohere: 'command-r-08-2024',
  gateway: 'openai/gpt-4o-mini',
}

const MODEL_VARS: Record<ProviderId, keyof Env> = {
  gemini: 'GEMINI_MODEL',
  groq: 'GROQ_MODEL',
  mistral: 'MISTRAL_MODEL',
  cerebras: 'CEREBRAS_MODEL',
  cloudflare: 'CLOUDFLARE_MODEL',
  openrouter: 'OPENROUTER_MODEL',
  nvidia: 'NVIDIA_MODEL',
  huggingface: 'HUGGINGFACE_MODEL',
  cohere: 'COHERE_MODEL',
  gateway: 'GATEWAY_MODEL',
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
  cerebras: {
    url: 'https://api.cerebras.ai/v1/chat/completions',
    key: (env) => env.CEREBRAS_API_KEY,
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
  gateway: {
    url: 'https://ai-gateway.vercel.sh/v1/chat/completions',
    key: (env) => env.AI_GATEWAY_API_KEY,
  },
}

export function modelFor(provider: ProviderId, env: Env): string {
  const override = env[MODEL_VARS[provider]]
  return typeof override === 'string' && override.trim()
    ? override.trim()
    : DEFAULT_MODELS[provider]
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

async function openAiCompatible(
  provider: ProviderId,
  env: Env,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const spec = OPENAI_COMPATIBLE[provider]
  const key = spec?.key(env)
  if (!spec || !key) throw new Error('not configured')
  const response = await fetch(spec.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
      ...spec.headers,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const text = data.choices?.[0]?.message?.content
  if (typeof text !== 'string' || !text.trim()) throw new Error('empty response')
  return text
}

async function callGemini(
  key: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content)
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents,
        ...(system.length
          ? { systemInstruction: { parts: [{ text: system.join('\n') }] } }
          : {}),
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    },
  )
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
  if (!text?.trim()) throw new Error('empty response')
  return text
}

/** Runs a Workers AI model through the binding, or over REST when there is none. */
export async function runCloudflare(env: Env, model: string, input: unknown): Promise<unknown> {
  if (env.AI) return env.AI.run(model, input)
  const rest = cloudflareRest(env)
  if (!rest) throw new Error('not configured')
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${rest.account}/ai/run/${model}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${rest.token}` },
      body: JSON.stringify(input),
    },
  )
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = (await response.json()) as { result?: unknown }
  return data.result
}

async function callCloudflare(
  env: Env,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const data = (await runCloudflare(env, model, {
    messages,
    max_tokens: maxTokens,
    temperature,
  })) as { response?: string } | null
  const text = data?.response
  if (typeof text !== 'string' || !text.trim()) throw new Error('empty response')
  return text
}

export interface ChatOptions {
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
}

export async function callProvider(
  provider: ProviderId,
  env: Env,
  { messages, maxTokens = 700, temperature = 0.4 }: ChatOptions,
): Promise<ChatResult> {
  const model = modelFor(provider, env)
  let text: string
  if (provider === 'gemini') {
    text = await callGemini(env.GEMINI_API_KEY as string, model, messages, maxTokens, temperature)
  } else if (provider === 'cloudflare') {
    text = await callCloudflare(env, model, messages, maxTokens, temperature)
  } else {
    text = await openAiCompatible(provider, env, model, messages, maxTokens, temperature)
  }
  return { provider, model, text }
}

/** Tries each provider in order and returns the first success. */
export async function chatWithFallback(
  order: ProviderId[],
  env: Env,
  options: ChatOptions,
): Promise<{ result: ChatResult | null; failed: ProviderId[] }> {
  const failed: ProviderId[] = []
  for (const provider of order) {
    try {
      return { result: await callProvider(provider, env, options), failed }
    } catch {
      failed.push(provider)
    }
  }
  return { result: null, failed }
}
