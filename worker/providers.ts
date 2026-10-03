export type ProviderId = 'cloudflare' | 'gemini' | 'groq' | 'openrouter' | 'huggingface'

export const PROVIDER_IDS: readonly ProviderId[] = [
  'cloudflare',
  'gemini',
  'groq',
  'openrouter',
  'huggingface',
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
  OPENROUTER_API_KEY?: string
  HUGGINGFACE_API_KEY?: string
  /** Optional overrides, e.g. GROQ_MODEL. */
  CLOUDFLARE_MODEL?: string
  GEMINI_MODEL?: string
  GROQ_MODEL?: string
  OPENROUTER_MODEL?: string
  HUGGINGFACE_MODEL?: string
  /** Optional comma-separated fallback order, e.g. "gemini,groq,cloudflare". */
  PROVIDER_ORDER?: string
}

export interface ChatResult {
  provider: ProviderId
  model: string
  text: string
}

const DEFAULT_MODELS: Record<ProviderId, string> = {
  cloudflare: '@cf/meta/llama-3.1-8b-instruct',
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  huggingface: 'meta-llama/Llama-3.3-70B-Instruct',
}

const MODEL_VARS: Record<ProviderId, keyof Env> = {
  cloudflare: 'CLOUDFLARE_MODEL',
  gemini: 'GEMINI_MODEL',
  groq: 'GROQ_MODEL',
  openrouter: 'OPENROUTER_MODEL',
  huggingface: 'HUGGINGFACE_MODEL',
}

export function modelFor(provider: ProviderId, env: Env): string {
  const override = env[MODEL_VARS[provider]]
  return typeof override === 'string' && override.trim()
    ? override.trim()
    : DEFAULT_MODELS[provider]
}

export function isConfigured(provider: ProviderId, env: Env): boolean {
  switch (provider) {
    case 'cloudflare':
      return Boolean(env.AI)
    case 'gemini':
      return Boolean(env.GEMINI_API_KEY)
    case 'groq':
      return Boolean(env.GROQ_API_KEY)
    case 'openrouter':
      return Boolean(env.OPENROUTER_API_KEY)
    case 'huggingface':
      return Boolean(env.HUGGINGFACE_API_KEY)
  }
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
export function resolveOrder(requested: unknown, env: Env): ProviderId[] {
  const asked = parseProviderList(requested)
  const base = asked.length
    ? asked
    : parseProviderList(env.PROVIDER_ORDER).length
      ? parseProviderList(env.PROVIDER_ORDER)
      : [...PROVIDER_IDS]
  return base.filter((id) => isConfigured(id, env))
}

async function openAiCompatible(
  url: string,
  key: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
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

async function callCloudflare(
  ai: AiBinding,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  temperature: number,
): Promise<string> {
  const data = (await ai.run(model, {
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
  { messages, maxTokens = 600, temperature = 0.4 }: ChatOptions,
): Promise<ChatResult> {
  const model = modelFor(provider, env)
  let text: string
  switch (provider) {
    case 'cloudflare':
      text = await callCloudflare(env.AI as AiBinding, model, messages, maxTokens, temperature)
      break
    case 'gemini':
      text = await callGemini(env.GEMINI_API_KEY as string, model, messages, maxTokens, temperature)
      break
    case 'groq':
      text = await openAiCompatible(
        'https://api.groq.com/openai/v1/chat/completions',
        env.GROQ_API_KEY as string,
        model,
        messages,
        maxTokens,
        temperature,
      )
      break
    case 'openrouter':
      text = await openAiCompatible(
        'https://openrouter.ai/api/v1/chat/completions',
        env.OPENROUTER_API_KEY as string,
        model,
        messages,
        maxTokens,
        temperature,
        { 'x-title': 'Parle+' },
      )
      break
    case 'huggingface':
      text = await openAiCompatible(
        'https://router.huggingface.co/v1/chat/completions',
        env.HUGGINGFACE_API_KEY as string,
        model,
        messages,
        maxTokens,
        temperature,
      )
      break
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
