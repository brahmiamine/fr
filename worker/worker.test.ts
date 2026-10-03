// @vitest-environment node
import { describe, expect, it, vi, afterEach } from 'vitest'
import { handleApi } from './index'
import { resolveOrder, type Env } from './providers'
import { extractJson } from './tasks'

const assets = { fetch: async () => new Response('') }

function task(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('https://x.test/api/task', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function openAiReply(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }))
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

  it('reads the key names used in Cloudflare (HF_TOKEN, REST token pair…)', () => {
    const env: Env = {
      ASSETS: assets,
      HF_TOKEN: 'k',
      MISTRAL_API_KEY: 'k',
      CEREBRAS_API_KEY: 'k',
      NVIDIA_API_KEY: 'k',
      COHERE_API_KEY: 'k',
      AI_GATEWAY_API_KEY: 'k',
      CLOUDFLARE_ACCOUNT_ID: 'a',
      CLOUDFLARE_AI_API_TOKEN: 't',
    }
    expect(resolveOrder(undefined, env).sort()).toEqual(
      ['cerebras', 'cloudflare', 'cohere', 'gateway', 'huggingface', 'mistral', 'nvidia'].sort(),
    )
  })

  it('needs both Cloudflare REST values', () => {
    expect(resolveOrder(['cloudflare'], { ASSETS: assets, CLOUDFLARE_ACCOUNT_ID: 'a' })).toEqual([])
  })
})

describe('extractJson', () => {
  it('finds JSON wrapped in prose or fences', () => {
    expect(extractJson('Voici :\n```json\n{"a": 1}\n```')).toEqual({ a: 1 })
    expect(extractJson('pas de json')).toBeNull()
  })
})

describe('/api/status', () => {
  it('reports configured providers, never the keys', async () => {
    const env: Env = { ASSETS: assets, GROQ_API_KEY: 'secret-value' }
    const response = await handleApi(new Request('https://x.test/api/status'), env)
    const text = await response.text()
    expect(text).not.toContain('secret-value')
    const data = JSON.parse(text) as { providers: { id: string; configured: boolean }[] }
    expect(data.providers.find((p) => p.id === 'groq')?.configured).toBe(true)
    expect(data.providers.find((p) => p.id === 'gemini')?.configured).toBe(false)
  })
})

describe('access code', () => {
  const env: Env = { ASSETS: assets, GROQ_API_KEY: 'k', AI_ACCESS_CODE: 'sesame' }
  const body = { task: 'question', input: {} }

  it('refuses requests without the code', async () => {
    expect((await handleApi(task(body), env)).status).toBe(401)
    expect((await handleApi(task(body, { 'x-access-code': 'nope' }), env)).status).toBe(401)
  })

  it('accepts the right code', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => openAiReply('{"text":"Ta ville idéale ?"}'))
    const response = await handleApi(task(body, { 'x-access-code': 'sesame' }), env)
    expect(response.status).toBe(200)
  })

  it('lets the status page tell whether the code is right', async () => {
    const response = await handleApi(new Request('https://x.test/api/status'), env)
    const data = (await response.json()) as { accessRequired: boolean; accessOk: boolean }
    expect(data).toMatchObject({ accessRequired: true, accessOk: false })
  })
})

describe('/api/task', () => {
  const env: Env = { ASSETS: assets, GROQ_API_KEY: 'k', GEMINI_API_KEY: 'k' }

  it('rejects unknown tasks and invalid input', async () => {
    expect((await handleApi(task({ task: 'free-chat', input: {} }), env)).status).toBe(400)
    expect((await handleApi(task({ task: 'analyze-speech', input: {} }), env)).status).toBe(400)
  })

  it('answers 503 when no provider is configured', async () => {
    const response = await handleApi(task({ task: 'question', input: {} }), { ASSETS: assets })
    expect(response.status).toBe(503)
  })

  it('shapes the speech analysis', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      openAiReply(
        'Bien sûr ! {"summary":"Bravo","corrections":[{"said":"je suis d\'accord avec toi","better":"je partage ton avis"}],' +
          '"expressions":[{"expression":"D\'un autre côté","intent":"nuancer"}],"blockedWord":null}',
      ),
    )
    const response = await handleApi(
      task({ task: 'analyze-speech', providers: ['groq'], input: { transcript: 'euh je suis d\'accord' } }),
      env,
    )
    const data = (await response.json()) as { data: Record<string, unknown>; provider: string }
    expect(data.provider).toBe('groq')
    expect(data.data).toMatchObject({
      summary: 'Bravo',
      corrections: [{ better: 'je partage ton avis' }],
      expressions: [{ expression: "D'un autre côté", intent: 'nuancer' }],
      blockedWord: null,
    })
  })

  it('moves on when a provider fails or answers garbage', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('groq.com')) return openAiReply('désolé, pas de JSON')
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"text":"Quel est ton souvenir ?"}' }] } }] }),
      )
    })
    const response = await handleApi(
      task({ task: 'question', providers: ['groq', 'gemini'], input: {} }),
      env,
    )
    const data = (await response.json()) as { provider: string; data: { text: string }; failed: string[] }
    expect(data.provider).toBe('gemini')
    expect(data.data.text).toBe('Quel est ton souvenir ?')
    expect(data.failed).toEqual(['groq'])
  })

  it('answers 502 when every provider fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }))
    const response = await handleApi(task({ task: 'question', input: {} }), env)
    expect(response.status).toBe(502)
  })

  it('returns plain text for the role-play', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => openAiReply('Pourquoi êtes-vous en retard ?'))
    const response = await handleApi(
      task({ task: 'roleplay', input: { situation: 'Réunion', history: [] } }),
      env,
    )
    const data = (await response.json()) as { data: { text: string } }
    expect(data.data.text).toBe('Pourquoi êtes-vous en retard ?')
  })
})

describe('/api/transcribe', () => {
  it('transcribes with the first configured provider', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ text: ' euh bonjour ' })))
    const form = new FormData()
    form.append('file', new Blob(['abc'], { type: 'audio/webm' }), 'a.webm')
    const response = await handleApi(
      new Request('https://x.test/api/transcribe', { method: 'POST', body: form }),
      { ASSETS: assets, GROQ_API_KEY: 'k' },
    )
    expect(await response.json()).toMatchObject({ provider: 'groq', text: 'euh bonjour' })
  })

  it('refuses a missing file', async () => {
    const response = await handleApi(
      new Request('https://x.test/api/transcribe', { method: 'POST', body: new FormData() }),
      { ASSETS: assets, GROQ_API_KEY: 'k' },
    )
    expect(response.status).toBe(400)
  })
})
