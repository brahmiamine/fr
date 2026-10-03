import { describe, expect, it, vi, afterEach } from 'vitest'
import { handleApi } from './index'
import { resolveOrder, type Env } from './providers'

const assets = { fetch: async () => new Response('') }

function post(body: unknown): Request {
  return new Request('https://x.test/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

afterEach(() => vi.restoreAllMocks())

describe('provider order', () => {
  it('keeps only configured providers, in the requested order', () => {
    const env: Env = { ASSETS: assets, GROQ_API_KEY: 'k', GEMINI_API_KEY: 'k' }
    expect(resolveOrder(['groq', 'huggingface', 'gemini'], env)).toEqual(['groq', 'gemini'])
  })

  it('uses PROVIDER_ORDER when nothing is requested', () => {
    const env: Env = {
      ASSETS: assets,
      GROQ_API_KEY: 'k',
      GEMINI_API_KEY: 'k',
      PROVIDER_ORDER: 'groq,gemini',
    }
    expect(resolveOrder(undefined, env)).toEqual(['groq', 'gemini'])
  })
})

describe('/api', () => {
  it('reports which providers are configured, never the keys', async () => {
    const env: Env = { ASSETS: assets, GROQ_API_KEY: 'secret-value' }
    const response = await handleApi(new Request('https://x.test/api/status'), env)
    const text = await response.text()
    expect(text).not.toContain('secret-value')
    const data = JSON.parse(text) as { providers: { id: string; configured: boolean }[] }
    expect(data.providers.find((p) => p.id === 'groq')?.configured).toBe(true)
    expect(data.providers.find((p) => p.id === 'gemini')?.configured).toBe(false)
  })

  it('answers 503 when no provider is configured', async () => {
    const response = await handleApi(
      post({ messages: [{ role: 'user', content: 'Bonjour' }] }),
      { ASSETS: assets },
    )
    expect(response.status).toBe(503)
  })

  it('rejects malformed messages', async () => {
    const response = await handleApi(post({ messages: [] }), {
      ASSETS: assets,
      GROQ_API_KEY: 'k',
    })
    expect(response.status).toBe(400)
  })

  it('falls back to the next provider when one fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('groq.com')) return new Response('', { status: 429 })
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Salut' }] } }] }),
      )
    })
    const response = await handleApi(
      post({ messages: [{ role: 'user', content: 'Bonjour' }], providers: ['groq', 'gemini'] }),
      { ASSETS: assets, GROQ_API_KEY: 'k', GEMINI_API_KEY: 'k' },
    )
    const data = (await response.json()) as { provider: string; text: string; failed: string[] }
    expect(data.provider).toBe('gemini')
    expect(data.text).toBe('Salut')
    expect(data.failed).toEqual(['groq'])
  })

  it('answers 502 when every provider fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }))
    const response = await handleApi(
      post({ messages: [{ role: 'user', content: 'Bonjour' }] }),
      { ASSETS: assets, GROQ_API_KEY: 'k' },
    )
    expect(response.status).toBe(502)
  })
})
