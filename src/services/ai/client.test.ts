import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTINGS_KEY } from '../settings/settings'
import {
  AiError,
  countFillers,
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

  it('sends the access code and the chosen provider once enabled', async () => {
    setAi({ aiEnabled: true, aiAccessCode: ' sesame ', aiProvider: 'groq' })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ data: { text: 'ok' }, provider: 'groq' })))
    await runAiTask('question', { theme: 'voyage' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/task')
    expect((init?.headers as Record<string, string>)['x-access-code']).toBe('sesame')
    expect(JSON.parse(String(init?.body)).providers).toEqual(['groq'])
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
    expect(countFillers('Euh, je pense, hum... ben oui, bien sûr. Heuuu')).toBe(4)
    expect(countFillers('Un thème humain et bénéfique')).toBe(0)
  })
})
