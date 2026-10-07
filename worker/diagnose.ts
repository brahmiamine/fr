import {
  PROVIDER_IDS,
  callModel,
  cloudflareRest,
  isConfigured,
  modelsFor,
  parseProviderList,
  type Env,
  type ProviderId,
} from './providers'
import { buildTask, extractJson, type TaskSpec } from './tasks'
import { TRANSCRIBE_PROVIDERS, transcribeModelFor, transcribeWith } from './transcribe'

/**
 * GET /api/diagnose — tests every candidate model of every configured provider
 * with the real "question" task, and every transcription model with a second of
 * silence, then reports what each one answered or the exact error.
 *
 *   ?provider=groq,mistral  only these providers
 *   ?list=1                 also list the model ids each provider's key can use
 *
 * Costs one short request per model, so a full run is allowed once a minute.
 */

interface ModelReport {
  provider: ProviderId
  model: string
  kind: 'text' | 'audio'
  ok: boolean
  ms: number
  sample?: string
  tokens?: number
  error?: string
}

const COOLDOWN_MS = 60_000
let lastRun = 0

/** Model list endpoints, for the providers that have one. */
const LIST_URLS: Partial<Record<ProviderId, (env: Env) => { url: string; headers: Record<string, string> } | null>> = {
  groq: (env) => bearer('https://api.groq.com/openai/v1/models', env.GROQ_API_KEY),
  mistral: (env) => bearer('https://api.mistral.ai/v1/models', env.MISTRAL_API_KEY),
  openrouter: (env) => bearer('https://openrouter.ai/api/v1/models', env.OPENROUTER_API_KEY),
  nvidia: (env) => bearer('https://integrate.api.nvidia.com/v1/models', env.NVIDIA_API_KEY),
  huggingface: (env) => bearer('https://router.huggingface.co/v1/models', env.HF_TOKEN ?? env.HUGGINGFACE_API_KEY),
  cohere: (env) => bearer('https://api.cohere.ai/compatibility/v1/models', env.COHERE_API_KEY),
  gemini: (env) =>
    env.GEMINI_API_KEY
      ? {
          url: 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
          headers: { 'x-goog-api-key': env.GEMINI_API_KEY },
        }
      : null,
  cloudflare: (env) => {
    const rest = cloudflareRest(env)
    return rest
      ? bearer(
          `https://api.cloudflare.com/client/v4/accounts/${rest.account}/ai/models/search?task=Text%20Generation&per_page=100`,
          rest.token,
        )
      : null
  },
}

function bearer(url: string, key: string | undefined) {
  return key ? { url, headers: { authorization: `Bearer ${key}` } } : null
}

async function listModels(provider: ProviderId, env: Env): Promise<string[] | string> {
  const target = LIST_URLS[provider]?.(env)
  if (!target) return 'no list endpoint or key'
  try {
    const response = await fetch(target.url, { headers: target.headers })
    if (!response.ok) return `HTTP ${response.status}`
    const data = (await response.json()) as {
      data?: { id?: string; name?: string }[]
      models?: { name?: string }[]
      result?: { name?: string }[]
    }
    const items = data.data ?? data.models ?? data.result ?? []
    return items
      .map((item) => String((item as { id?: string }).id ?? item.name ?? ''))
      .filter(Boolean)
      .sort()
  } catch (error) {
    return String(error)
  }
}

async function testText(provider: ProviderId, env: Env, spec: TaskSpec): Promise<ModelReport[]> {
  const reports: ModelReport[] = []
  // One model after the other: providers rate-limit bursts.
  for (const model of modelsFor(provider, env)) {
    const startedAt = Date.now()
    try {
      const result = await callModel(provider, model, env, spec)
      const data = spec.shape(extractJson(result.text))
      reports.push({
        provider,
        model: model.id,
        kind: 'text',
        ok: Boolean(data),
        ms: Date.now() - startedAt,
        sample: result.text.slice(0, 160),
        tokens: result.usage?.totalTokens,
        ...(data ? {} : { error: 'answer is not the expected JSON' }),
      })
    } catch (error) {
      reports.push({
        provider,
        model: model.id,
        kind: 'text',
        ok: false,
        ms: Date.now() - startedAt,
        error: String((error as Error)?.message ?? error),
      })
    }
  }
  return reports
}

/** One second of 16 kHz mono silence, as a WAV file. */
function silentWav(): Blob {
  const samples = 16_000
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)
  const ascii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 16_000, true)
  view.setUint32(28, 32_000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, samples * 2, true)
  return new Blob([buffer], { type: 'audio/wav' })
}

async function testAudio(provider: ProviderId, env: Env): Promise<ModelReport> {
  const model = transcribeModelFor(provider, env)
  const startedAt = Date.now()
  try {
    const { text } = await transcribeWith(provider, env, silentWav(), 'fr')
    return { provider, model, kind: 'audio', ok: true, ms: Date.now() - startedAt, sample: text.slice(0, 80) }
  } catch (error) {
    const message = String((error as Error)?.message ?? error)
    // Silence legitimately gives an empty transcript: the call itself worked.
    const ok = message === 'empty response'
    return { provider, model, kind: 'audio', ok, ms: Date.now() - startedAt, ...(ok ? { sample: '' } : { error: message }) }
  }
}

export async function diagnose(
  env: Env,
  params: URLSearchParams,
): Promise<{ status: number; body: unknown }> {
  const now = Date.now()
  if (now - lastRun < COOLDOWN_MS) {
    return { status: 429, body: { error: 'diagnose already ran less than a minute ago' } }
  }
  lastRun = now

  const asked = parseProviderList(params.get('provider') ?? '')
  const providers = (asked.length ? asked : [...PROVIDER_IDS]).filter((id) => isConfigured(id, env))
  const spec = buildTask('question', { theme: 'Quotidien', avoid: [] }) as TaskSpec

  const perProvider = await Promise.all(
    providers.map(async (provider) => {
      const text = await testText(provider, env, spec)
      const audio = TRANSCRIBE_PROVIDERS.includes(provider) ? [await testAudio(provider, env)] : []
      const available = params.get('list') ? await listModels(provider, env) : undefined
      return { provider, reports: [...text, ...audio], available }
    }),
  )

  const reports = perProvider.flatMap((entry) => entry.reports)
  return {
    status: 200,
    body: {
      checkedAt: new Date(now).toISOString(),
      notConfigured: PROVIDER_IDS.filter((id) => !isConfigured(id, env)),
      summary: providers.map((provider) => {
        const working = reports.filter((r) => r.provider === provider && r.kind === 'text' && r.ok)
        return { provider, ok: working.length > 0, firstWorking: working[0]?.model ?? null }
      }),
      reports,
      ...(params.get('list')
        ? { available: Object.fromEntries(perProvider.map((entry) => [entry.provider, entry.available])) }
        : {}),
    },
  }
}
