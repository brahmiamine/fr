import {
  PROVIDER_IDS,
  chatWithFallback,
  isConfigured,
  modelFor,
  resolveOrder,
  type Env,
  type ProviderId,
} from './providers'
import { TASK_NAMES, buildTask, extractJson, type TaskName } from './tasks'
import {
  MAX_AUDIO_BYTES,
  TRANSCRIBE_PROVIDERS,
  transcribeModelFor,
  transcribeWithFallback,
} from './transcribe'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** True when no access code is required, or the request carries the right one. */
export function hasAccess(request: Request, env: Env): boolean {
  if (!env.AI_ACCESS_CODE) return true
  return safeEqual(request.headers.get('x-access-code') ?? '', env.AI_ACCESS_CODE)
}

/** Model each provider was asked to use, so a failure still shows what was tried. */
function modelsOf(
  providers: string[],
  modelOf: (provider: ProviderId) => string,
): Record<string, string> {
  const models: Record<string, string> = {}
  for (const id of providers) {
    if (PROVIDER_IDS.includes(id as ProviderId)) models[id] = modelOf(id as ProviderId)
  }
  return models
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url)

  if (pathname === '/api/status' && request.method === 'GET') {
    return json({
      accessRequired: Boolean(env.AI_ACCESS_CODE),
      accessOk: hasAccess(request, env),
      providers: PROVIDER_IDS.map((id) => ({
        id,
        configured: isConfigured(id, env),
        model: modelFor(id, env),
        transcribe: TRANSCRIBE_PROVIDERS.includes(id),
      })),
    })
  }

  if (!hasAccess(request, env)) return json({ error: 'access code required' }, 401)

  if (pathname === '/api/task') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return json({ error: 'invalid JSON' }, 400)
    }
    const task = body.task as TaskName
    if (!TASK_NAMES.includes(task)) return json({ error: 'unknown task' }, 400)
    const spec = buildTask(task, body.input)
    if (!spec) return json({ error: 'invalid input' }, 400)

    const order = resolveOrder(body.providers, env)
    if (order.length === 0) return json({ error: 'no provider configured' }, 503)

    // A provider whose answer cannot be parsed counts as failed: try the next one.
    const failed: string[] = []
    const modelOfProvider = (id: ProviderId) => modelFor(id, env)
    const startedAt = Date.now()
    for (const provider of order) {
      const { result, failed: failures } = await chatWithFallback([provider], env, spec)
      if (!result) {
        failed.push(...failures)
        continue
      }
      if (!spec.json) {
        return json({
          provider: result.provider,
          model: result.model,
          data: { text: result.text.trim() },
          usage: result.usage,
          latencyMs: Date.now() - startedAt,
          failed,
          models: modelsOf(failed, modelOfProvider),
        })
      }
      const data = spec.shape(extractJson(result.text))
      if (data) {
        return json({
          provider: result.provider,
          model: result.model,
          data,
          usage: result.usage,
          latencyMs: Date.now() - startedAt,
          failed,
          models: modelsOf(failed, modelOfProvider),
        })
      }
      failed.push(provider)
    }
    return json({ error: 'all providers failed', failed, models: modelsOf(failed, modelOfProvider) }, 502)
  }

  if (pathname === '/api/transcribe') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return json({ error: 'invalid form' }, 400)
    }
    const file = form.get('file')
    if (!(file instanceof Blob) || file.size === 0) return json({ error: 'missing audio' }, 400)
    if (file.size > MAX_AUDIO_BYTES) return json({ error: 'audio too large' }, 413)

    const order = resolveOrder(
      String(form.get('providers') ?? ''),
      env,
      TRANSCRIBE_PROVIDERS,
    )
    if (order.length === 0) return json({ error: 'no transcription provider configured' }, 503)

    const startedAt = Date.now()
    const { provider, text, failed } = await transcribeWithFallback(order, env, file, 'fr')
    const modelOfProvider = (id: ProviderId) => transcribeModelFor(id, env)
    if (!provider) {
      return json({ error: 'all providers failed', failed, models: modelsOf(failed, modelOfProvider) }, 502)
    }
    return json({
      provider,
      model: transcribeModelFor(provider, env),
      text: text.trim(),
      audioBytes: file.size,
      latencyMs: Date.now() - startedAt,
      failed,
      models: modelsOf(failed, modelOfProvider),
    })
  }

  return json({ error: 'not found' }, 404)
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname.startsWith('/api/')) {
      return handleApi(request, env)
    }
    return env.ASSETS.fetch(request)
  },
}
