// @vitest-environment node
import { describe, expect, it, vi, afterEach } from 'vitest'
import { handleApi } from './index'
import { resetFailures, resolveOrder, type Env } from './providers'
import { extractJson } from './tasks'
import { MODEL_CATALOG } from './models'

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

afterEach(() => {
  vi.restoreAllMocks()
  resetFailures()
})

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
      NVIDIA_API_KEY: 'k',
      COHERE_API_KEY: 'k',
      CLOUDFLARE_ACCOUNT_ID: 'a',
      CLOUDFLARE_AI_API_TOKEN: 't',
    }
    expect(resolveOrder(undefined, env).sort()).toEqual(
      ['cloudflare', 'cohere', 'huggingface', 'mistral', 'nvidia'].sort(),
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
    expect((await handleApi(task({ task: 'analyze-fluency', input: {} }), env)).status).toBe(400)
    // A comparison needs at least two rounds on the same subject.
    expect(
      (await handleApi(task({ task: 'compare-432', input: { rounds: [{ label: 'Tour 1', transcript: 'a' }] } }), env)).status,
    ).toBe(400)
  })

  it('answers 503 when no provider is configured', async () => {
    const response = await handleApi(task({ task: 'question', input: {} }), { ASSETS: assets })
    expect(response.status).toBe(503)
  })

  it('shapes the fluency analysis and sends the measures', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      openAiReply(
        'Voici : {"summary":"Tu tiens ton idée","blockages":[{"evidence":"je… je… je pense","type":"sentence_restart","strategy":"Ne recommence pas"},' +
          '{"evidence":"le truc","type":"inventé","strategy":"Décris-le"},{"evidence":"x","type":"idea_block","strategy":"trop"}],' +
          '"missingWords":[{"word":"échéance","idea":"la date limite pour payer"},{"word":"sans idée"}],' +
          '"strategies":[{"chunk":"Ce que je veux dire, c\'est que…","use":"continuer"}],' +
          '"corrections":[{"said":"je suis d\'accord avec toi","better":"je partage ton avis"}],"microExercise":"Refais 30 s sans recommencer"}',
      ),
    )
    const response = await handleApi(
      task({
        task: 'analyze-fluency',
        providers: ['groq'],
        input: { transcript: 'euh je… je… je pense', situation: 'round', metrics: { fillers: 3, longPauses: 2, bogus: 9 } },
      }),
      env,
    )
    const data = (await response.json()) as { data: Record<string, unknown>; provider: string }
    expect(data.provider).toBe('groq')
    expect(data.data).toEqual({
      summary: 'Tu tiens ton idée',
      blockages: [
        { evidence: 'je… je… je pense', type: 'sentence_restart', strategy: 'Ne recommence pas' },
        // An unknown type falls back to "uncertain"; only 2 blockages are kept.
        { evidence: 'le truc', type: 'uncertain', strategy: 'Décris-le' },
      ],
      missingWords: [{ word: 'échéance', idea: 'la date limite pour payer' }],
      strategies: [{ chunk: "Ce que je veux dire, c'est que…", use: 'continuer' }],
      corrections: [{ said: "je suis d'accord avec toi", better: 'je partage ton avis' }],
      microExercise: 'Refais 30 s sans recommencer',
    })
    const sent = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)) as {
      messages: { content: string }[]
    }
    const user = sent.messages[1].content
    expect(user).toContain('« euh / hum » nus : 3')
    expect(user).toContain('silences de plus d’1 s : 2')
    expect(user).not.toContain('bogus')
  })

  it('says when no timing is known', async () => {
    const { metricsBlock } = await import('./tasks')
    expect(metricsBlock({ fillers: 2 })).toContain('ne prétends jamais connaître la durée')
    expect(metricsBlock({ fillers: 2, longPauses: 1 })).toContain('estimation')
  })

  it('compares the rounds of a 4-3-2', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      openAiReply(
        '{"summary":"Plus fluide","hesitations":"better","restarts":"same","continuity":"nope","contentKept":"worse",' +
          '"recited":true,"observations":["Tu récites","a","b","c"],"transfer":"","priority":"Reformule au lieu de réciter"}',
      ),
    )
    const response = await handleApi(
      task({
        task: 'compare-432',
        providers: ['groq'],
        input: {
          topic: 'Télétravail',
          rounds: [
            { label: 'Tour 1', transcript: 'un deux trois' },
            { label: 'Tour 2', transcript: 'un deux' },
            { label: 'Transfert', transcript: 'autre chose', transfer: true },
          ],
        },
      }),
      env,
    )
    const data = (await response.json()) as { data: Record<string, unknown> }
    expect(data.data).toMatchObject({
      hesitations: 'better',
      restarts: 'same',
      continuity: 'unknown',
      contentKept: 'worse',
      recited: true,
      observations: ['Tu récites', 'a', 'b'],
      priority: 'Reformule au lieu de réciter',
    })
    const sent = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body)) as {
      messages: { content: string }[]
    }
    expect(sent.messages[1].content).toContain('Transfert (transfert : autre sujet)')
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
    const data = (await response.json()) as {
      provider: string
      data: { text: string }
      failed: string[]
      models: Record<string, string>
    }
    expect(data.provider).toBe('gemini')
    expect(data.data.text).toBe('Quel est ton souvenir ?')
    expect(data.failed).toEqual(['groq'])
    expect(data.models).toEqual({ groq: MODEL_CATALOG.groq[0].id })
  })

  it('answers 502 when every provider fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 500 }))
    const response = await handleApi(task({ task: 'question', input: {} }), env)
    expect(response.status).toBe(502)
    const data = (await response.json()) as { failed: string[]; models: Record<string, string> }
    expect(data.failed.length).toBeGreaterThan(0)
    for (const id of data.failed) expect(data.models[id]).toBeTruthy()
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

  it('asks Whisper to keep hesitations and returns the word timestamps', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          text: 'euh je pense',
          words: [
            { word: 'euh', start: 0.1, end: 0.4 },
            { word: 'je', start: 1.9, end: 2.0 },
            { word: '', start: 2, end: 2.1 },
            { word: 'pense', start: 2.1, end: 2.5 },
          ],
        }),
      ),
    )
    const form = new FormData()
    form.append('file', new Blob(['abc'], { type: 'audio/webm' }), 'a.webm')
    const response = await handleApi(
      new Request('https://x.test/api/transcribe', { method: 'POST', body: form }),
      { ASSETS: assets, GROQ_API_KEY: 'k' },
    )
    const sent = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData
    expect(sent.get('prompt')).toContain('euh')
    expect(sent.get('response_format')).toBe('verbose_json')
    expect(await response.json()).toMatchObject({
      text: 'euh je pense',
      words: [
        { word: 'euh', start: 0.1, end: 0.4 },
        { word: 'je', start: 1.9, end: 2 },
        { word: 'pense', start: 2.1, end: 2.5 },
      ],
    })
  })

  it('transcribes again without timestamps when the model refuses them', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('timestamps not supported', { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ text: 'bonjour' })))
    const form = new FormData()
    form.append('file', new Blob(['abc'], { type: 'audio/webm' }), 'a.webm')
    const response = await handleApi(
      new Request('https://x.test/api/transcribe', { method: 'POST', body: form }),
      { ASSETS: assets, GROQ_API_KEY: 'k' },
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(((fetchMock.mock.calls[1][1] as RequestInit).body as FormData).get('response_format')).toBe('json')
    const data = (await response.json()) as Record<string, unknown>
    expect(data).toMatchObject({ provider: 'groq', text: 'bonjour' })
    expect(data.words).toBeUndefined()
  })

  it('reads the words nested in Whisper segments', async () => {
    const { timedWordsOf } = await import('./transcribe')
    expect(timedWordsOf({ segments: [{ words: [{ word: ' bon', start: 0, end: 0.3 }] }, {}] })).toEqual([
      { word: 'bon', start: 0, end: 0.3 },
    ])
    expect(timedWordsOf({ text: 'x' })).toBeUndefined()
  })

  it('refuses a missing file', async () => {
    const response = await handleApi(
      new Request('https://x.test/api/transcribe', { method: 'POST', body: new FormData() }),
      { ASSETS: assets, GROQ_API_KEY: 'k' },
    )
    expect(response.status).toBe(400)
  })
})

describe('usage reporting', () => {
  it('returns provider token counts and latency', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"text":"Ta ville ?"}' } }],
          usage: { prompt_tokens: 12, completion_tokens: 7, total_tokens: 19 },
        }),
      ),
    )
    const response = await handleApi(
      task({ task: 'question', providers: ['groq'], input: {} }),
      { ASSETS: assets, GROQ_API_KEY: 'k' },
    )
    const data = (await response.json()) as {
      model: string
      usage: { promptTokens: number; completionTokens: number; totalTokens: number }
      latencyMs: number
    }
    expect(data.usage).toEqual({ promptTokens: 12, completionTokens: 7, totalTokens: 19 })
    expect(data.model).toBe(MODEL_CATALOG.groq[0].id)
    expect(data.latencyMs).toBeGreaterThanOrEqual(0)
  })
})

describe('transfer-topic task', () => {
  const env: Env = { ASSETS: assets, GROQ_API_KEY: 'k' }
  const input = {
    title: 'Télétravail ou bureau ?',
    category: 'travail',
    transferPrompt: 'La semaine de quatre jours est-elle une bonne idée ?',
  }

  it('returns a new subject', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      openAiReply('{"text":"Vaut-il mieux vivre en ville ou à la campagne ?"}'),
    )
    const response = await handleApi(task({ task: 'transfer-topic', input }), env)
    const data = (await response.json()) as { data: { text: string } }
    expect(data.data.text).toBe('Vaut-il mieux vivre en ville ou à la campagne ?')
  })

  it('refuses a subject that repeats the worked one or the example', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      openAiReply('{"text":"Télétravail ou bureau"}'),
    )
    expect((await handleApi(task({ task: 'transfer-topic', input }), env)).status).toBe(502)

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      openAiReply('{"text":"La semaine de quatre jours est-elle une bonne idée"}'),
    )
    expect((await handleApi(task({ task: 'transfer-topic', input }), env)).status).toBe(502)
  })

  it('needs the worked subject', async () => {
    const response = await handleApi(task({ task: 'transfer-topic', input: {} }), env)
    expect(response.status).toBe(400)
  })
})

describe('fewer wasted requests', () => {
  const env: Env = { ASSETS: assets, GROQ_API_KEY: 'k', GEMINI_API_KEY: 'k' }
  const geminiReply = () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"text":"Et toi ?"}' }] } }] }))

  it('skips a provider whose key was just refused', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      String(input).includes('groq.com') ? new Response('bad key', { status: 401 }) : geminiReply(),
    )
    await handleApi(task({ task: 'question', providers: ['groq', 'gemini'], input: {} }), env)
    const groqCalls = () => fetchMock.mock.calls.filter(([input]) => String(input).includes('groq.com')).length
    expect(groqCalls()).toBe(1)

    const response = await handleApi(task({ task: 'question', providers: ['groq', 'gemini'], input: {} }), env)
    const data = (await response.json()) as { provider: string; failed: string[] }
    expect(data.provider).toBe('gemini')
    expect(data.failed).toEqual([])
    expect(groqCalls()).toBe(1)
  })

  it('tries the next model of a provider when one is gone', async () => {
    const models: string[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const model = JSON.parse(String(init?.body)).model as string
      models.push(model)
      return models.length === 1 ? new Response('model not found', { status: 404 }) : openAiReply('{"text":"Et toi ?"}')
    })
    const response = await handleApi(task({ task: 'question', providers: ['groq'], input: {} }), env)
    const data = (await response.json()) as { provider: string; model: string }
    expect(data.provider).toBe('groq')
    expect(data.model).toBe(models[1])
    expect(models[0]).not.toBe(models[1])
  })

  it('reports the exact error of every model in /api/diagnose', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response('quota exceeded', { status: 429 }))
    const response = await handleApi(new Request('https://x.test/api/diagnose?provider=groq'), env)
    const data = (await response.json()) as {
      summary: { provider: string; ok: boolean }[]
      reports: { model: string; ok: boolean; error?: string }[]
    }
    expect(data.summary).toEqual([{ provider: 'groq', ok: false, firstWorking: null }])
    expect(data.reports.length).toBeGreaterThan(1)
    expect(data.reports[0].error).toContain('HTTP 429: quota exceeded')
  })
})

describe('transcripts of silence', () => {
  it('drops the subtitle credits Whisper invents on silence, not real speech', async () => {
    const { cleanTranscript } = await import('./transcribe')
    expect(cleanTranscript(' Sous-titrage Société Radio-Canada')).toBe('')
    expect(cleanTranscript('Sous-titrage FR ?')).toBe('')
    expect(cleanTranscript('[silence]')).toBe('')
    expect(cleanTranscript('Silence, on tourne et je parle.')).toBe('Silence, on tourne et je parle.')
    expect(cleanTranscript('Bonjour, je parle.')).toBe('Bonjour, je parle.')
  })
})
