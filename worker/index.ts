import {
  PROVIDER_IDS,
  callProvider,
  isConfigured,
  modelFor,
  resolveOrder,
  type Attempt,
  type Env,
  type ProviderId,
} from './providers'
import { TASK_NAMES, buildTask, extractJson, type TaskName } from './tasks'
import { diagnose } from './diagnose'
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

/** Providers that failed, and the last model each one was asked to use. */
function failures(attempts: Attempt[]): { failed: string[]; models: Record<string, string> } {
  const models: Record<string, string> = {}
  for (const attempt of attempts) models[attempt.provider] = attempt.model
  return { failed: Object.keys(models), models }
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const { pathname } = url

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

  if (pathname === '/api/diagnose' && request.method === 'GET') {
    const result = await diagnose(env, url.searchParams)
    return json(result.body, result.status)
  }

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

    const attempts: Attempt[] = []
    const startedAt = Date.now()
    const answer = async (provider: ProviderId, ignoreFailures = false) => {
      const result = await callProvider(provider, env, spec, attempts, ignoreFailures)
      if (!result) return null
      const data = spec.json ? spec.shape(extractJson(result.text)) : { text: result.text.trim() }
      if (data) return { result, data }
      // A reply that cannot be parsed counts as failed: try the next provider.
      attempts.push({ provider, model: result.model, error: 'unusable answer' })
      return null
    }
    let found: Awaited<ReturnType<typeof answer>> = null
    for (const provider of order) {
      found = await answer(provider)
      if (found) break
    }
    // Every provider was skipped as recently failed: give the first one a real try.
    if (!found && attempts.length === 0) found = await answer(order[0], true)
    if (!found) return json({ error: 'all providers failed', ...failures(attempts) }, 502)
    return json({
      provider: found.result.provider,
      model: found.result.model,
      data: found.data,
      usage: found.result.usage,
      latencyMs: Date.now() - startedAt,
      ...failures(attempts),
    })
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
    const { provider, text, attempts } = await transcribeWithFallback(order, env, file, 'fr')
    if (!provider) return json({ error: 'all providers failed', ...failures(attempts) }, 502)
    return json({
      provider,
      model: transcribeModelFor(provider, env),
      text: text.trim(),
      audioBytes: file.size,
      latencyMs: Date.now() - startedAt,
      ...failures(attempts),
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
