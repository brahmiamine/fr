import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTINGS_KEY } from '../settings/settings'
import { clearAiStats, loadAiStats } from './stats'
import {
  AiError,
  countFillers,
  countMarkers,
  typeTokenRatio,
  countWords,
  fetchAiStatus,
  runAiTask,
  transcribeAudio,
} from './client'

function setAi(patch: Record<string, unknown>) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(patch))
}

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('AI master switch', () => {
  it('sends nothing while AI is disabled (the default)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    await expect(runAiTask('question', {})).rejects.toMatchObject({ code: 'disabled' })
    await expect(transcribeAudio('blob:x')).rejects.toBeInstanceOf(AiError)
    await expect(fetchAiStatus()).rejects.toMatchObject({ code: 'disabled' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends only to the chosen provider once enabled', async () => {
    setAi({ aiEnabled: true, aiProvider: 'groq' })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(
          JSON.stringify({
            data: { text: 'ok' },
            provider: 'groq',
            model: 'llama',
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
            latencyMs: 120,
            failed: ['gemini'],
          }),
        ))
    await runAiTask('question', { theme: 'voyage' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/task')
    expect(JSON.parse(String(init?.body)).providers).toEqual(['groq'])
  })

  it('records usage per model, with failures counted for the providers that missed', async () => {
    setAi({ aiEnabled: true })
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(
        JSON.stringify({
          data: {},
          provider: 'groq',
          model: 'llama',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          latencyMs: 120,
          failed: ['gemini'],
        }),
      ),
    )
    await runAiTask('question', {})
    await runAiTask('question', {})
    const stats = loadAiStats()
    expect(stats['groq:text']).toMatchObject({
      model: 'llama',
      requests: 2,
      successes: 2,
      totalTokens: 30,
      totalLatencyMs: 240,
    })
    expect(stats['gemini:text']).toMatchObject({ requests: 2, failures: 2 })
    clearAiStats()
    expect(loadAiStats()).toEqual({})
  })

  it('maps server errors to readable codes', async () => {
    setAi({ aiEnabled: true })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 401 }))
    await expect(runAiTask('question', {})).rejects.toMatchObject({ code: 'access' })
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('offline'))
    await expect(runAiTask('question', {})).rejects.toMatchObject({ code: 'network' })
  })
})

describe('transcript counting', () => {
  it('counts words and spoken hesitations', () => {
    expect(countWords('  je pense que  oui ')).toBe(4)
    expect(countWords('')).toBe(0)
    expect(countFillers('Euh, je pense, hum... ben oui, bien sûr. Heuuu')).toBe(3)
    expect(countFillers('Un thème humain et bénéfique')).toBe(0)
    expect(countMarkers('Bon, en fait, disons que… ben oui, du coup.')).toBe(5)
    expect(countMarkers('Un bonbon bien fait')).toBe(0)
    expect(typeTokenRatio('le chat le chien', 4)).toBe(0.75)
    expect(typeTokenRatio('trop court', 200)).toBeNull()
  })
})
