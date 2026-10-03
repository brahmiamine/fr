import {
  PROVIDER_IDS,
  chatWithFallback,
  isConfigured,
  modelFor,
  resolveOrder,
  type ChatMessage,
  type Env,
} from './providers'

const MAX_MESSAGES = 20
const MAX_CONTENT_CHARS = 8000

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

function parseMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) return null
  const messages: ChatMessage[] = []
  for (const item of raw) {
    const { role, content } = (item ?? {}) as Partial<ChatMessage>
    if (
      (role !== 'system' && role !== 'user' && role !== 'assistant') ||
      typeof content !== 'string' ||
      !content.trim() ||
      content.length > MAX_CONTENT_CHARS
    ) {
      return null
    }
    messages.push({ role, content })
  }
  return messages
}

export async function handleApi(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url)

  if (pathname === '/api/status' && request.method === 'GET') {
    return json({
      providers: PROVIDER_IDS.map((id) => ({
        id,
        configured: isConfigured(id, env),
        model: modelFor(id, env),
      })),
    })
  }

  if (pathname === '/api/chat') {
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)
    let body: Record<string, unknown>
    try {
      body = (await request.json()) as Record<string, unknown>
    } catch {
      return json({ error: 'invalid JSON' }, 400)
    }
    const messages = parseMessages(body.messages)
    if (!messages) return json({ error: 'invalid messages' }, 400)

    const order = resolveOrder(body.providers ?? body.provider, env)
    if (order.length === 0) return json({ error: 'no provider configured' }, 503)

    const maxTokens =
      typeof body.maxTokens === 'number' ? Math.min(Math.max(body.maxTokens, 1), 1500) : undefined
    const temperature =
      typeof body.temperature === 'number' ? Math.min(Math.max(body.temperature, 0), 1) : undefined

    const { result, failed } = await chatWithFallback(order, env, {
      messages,
      maxTokens,
      temperature,
    })
    if (!result) return json({ error: 'all providers failed', failed }, 502)
    return json({ ...result, failed })
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
