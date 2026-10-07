import {
  ProviderError,
  isDown,
  markFailure,
  runCloudflare,
  type Attempt,
  type Env,
  type ProviderId,
} from './providers'

/** Providers able to turn speech into text, best French support first. */
export const TRANSCRIBE_PROVIDERS: readonly ProviderId[] = [
  'groq',
  'mistral',
  'gemini',
  'cloudflare',
]

function transcribeModel(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback
}

/** Model used to transcribe with a given provider. */
export function transcribeModelFor(provider: ProviderId, env: Env): string {
  switch (provider) {
    case 'groq':
      return transcribeModel(env.GROQ_TRANSCRIBE_MODEL, 'whisper-large-v3-turbo')
    case 'mistral':
      return transcribeModel(env.MISTRAL_TRANSCRIBE_MODEL, 'voxtral-mini-latest')
    case 'gemini':
      return transcribeModel(env.GEMINI_TRANSCRIBE_MODEL, 'gemini-3.5-flash-lite')
    default:
      return transcribeModel(env.CLOUDFLARE_TRANSCRIBE_MODEL, '@cf/openai/whisper-large-v3-turbo')
  }
}

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024

/** A transcribed word with its position in the recording, in seconds. */
export interface TimedWord {
  word: string
  start: number
  end: number
}

export interface Transcription {
  text: string
  /** Only when the provider gives word timestamps (Whisper on Groq or Workers AI). */
  words?: TimedWord[]
}

/** Upper bound on the timed words sent back (≈ 12 minutes of speech). */
const MAX_TIMED_WORDS = 2500

/**
 * Whisper writes clean text by default: it drops "euh", "je… je…" and false
 * starts, exactly what a fluency analysis needs. A hesitant example as prompt
 * makes it keep them ("Parler sans bloquer": transcription tools "suppriment
 * les euh et les faux départs").
 */
export const DISFLUENT_PROMPT =
  'Euh… alors, je… je pense que, hum, enfin… c’est… comment dire… bon, en fait, euh, voilà.'

/** Word timestamps found in a Whisper answer (`words`, or `segments[].words`). */
export function timedWordsOf(data: unknown): TimedWord[] | undefined {
  const record = (data ?? {}) as { words?: unknown; segments?: unknown }
  const raw: unknown[] = Array.isArray(record.words)
    ? record.words
    : Array.isArray(record.segments)
      ? record.segments.flatMap((segment) => {
          const words = (segment as { words?: unknown })?.words
          return Array.isArray(words) ? words : []
        })
      : []
  const words: TimedWord[] = []
  for (const item of raw) {
    const entry = item as { word?: unknown; start?: unknown; end?: unknown }
    const word = typeof entry?.word === 'string' ? entry.word.trim() : ''
    const start = Number(entry?.start)
    const end = Number(entry?.end)
    if (!word || !Number.isFinite(start) || !Number.isFinite(end) || end < start) continue
    words.push({ word, start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100 })
    if (words.length >= MAX_TIMED_WORDS) break
  }
  return words.length > 0 ? words : undefined
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step))
  }
  return btoa(binary)
}

interface MultipartOptions {
  /** Prompt that steers Whisper towards a verbatim transcript. */
  prompt?: string
  /** Ask for word timestamps (`verbose_json`). */
  timestamps?: boolean
}

async function multipartTranscription(
  url: string,
  key: string,
  model: string,
  file: Blob,
  language: string,
  options: MultipartOptions = {},
): Promise<Transcription> {
  const form = new FormData()
  form.append('file', file, 'audio.webm')
  form.append('model', model)
  form.append('language', language)
  if (options.prompt) form.append('prompt', options.prompt)
  if (options.timestamps) {
    form.append('response_format', 'verbose_json')
    form.append('timestamp_granularities[]', 'word')
    form.append('timestamp_granularities[]', 'segment')
  } else {
    form.append('response_format', 'json')
  }
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: { authorization: `Bearer ${key}` },
    body: form,
  })
  if (!response.ok) {
    // A model that refuses timestamps still transcribes: ask again without them.
    if (options.timestamps && response.status === 400) {
      return multipartTranscription(url, key, model, file, language, { ...options, timestamps: false })
    }
    throw new ProviderError(response.status, (await response.text().catch(() => '')).slice(0, 300))
  }
  const data = (await response.json()) as { text?: string }
  if (typeof data.text !== 'string') throw new Error('empty response')
  const words = options.timestamps ? timedWordsOf(data) : undefined
  return words ? { text: data.text, words } : { text: data.text }
}

/**
 * Whisper invents a TV subtitle credit when it hears silence: such a transcript
 * means nothing was said.
 */
const SILENCE_HALLUCINATION = /^\W*(silence|(sous-titrage|sous-titres|merci d'avoir regard)[^.!?]*)[.!?]?\W*$/i

export function cleanTranscript(text: string): string {
  return SILENCE_HALLUCINATION.test(text.trim()) ? '' : text
}

export async function transcribeWith(
  provider: ProviderId,
  env: Env,
  file: Blob,
  language: string,
): Promise<Transcription> {
  switch (provider) {
    case 'groq':
      return multipartTranscription(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        env.GROQ_API_KEY as string,
        transcribeModel(env.GROQ_TRANSCRIBE_MODEL, 'whisper-large-v3-turbo'),
        file,
        language,
        { prompt: DISFLUENT_PROMPT, timestamps: true },
      )
    case 'mistral':
      return multipartTranscription(
        'https://api.mistral.ai/v1/audio/transcriptions',
        env.MISTRAL_API_KEY as string,
        transcribeModel(env.MISTRAL_TRANSCRIBE_MODEL, 'voxtral-mini-latest'),
        file,
        language,
      )
    case 'gemini': {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          transcribeModel(env.GEMINI_TRANSCRIBE_MODEL, 'gemini-3.5-flash-lite'),
        )}:generateContent`,
        {
          method: 'POST',
          signal: AbortSignal.timeout(30_000),
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': env.GEMINI_API_KEY as string,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text:
                      'Transcris fidèlement cet enregistrement en français, mot à mot, ' +
                      'en gardant les hésitations (euh, hum) et les répétitions. ' +
                      'Réponds uniquement par la transcription. ' +
                      "Si personne ne parle, réponds exactement : [silence]",
                  },
                  {
                    inline_data: {
                      mime_type: (file.type || 'audio/webm').split(';')[0],
                      data: toBase64(bytes),
                    },
                  },
                ],
              },
            ],
            generationConfig: { thinkingConfig: { thinkingLevel: 'minimal' } },
          }),
        },
      )
      if (!response.ok) {
        throw new ProviderError(response.status, (await response.text().catch(() => '')).slice(0, 300))
      }
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
      if (text === undefined) throw new Error('empty response')
      return { text }
    }
    case 'cloudflare': {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const data = (await runCloudflare(env, transcribeModel(env.CLOUDFLARE_TRANSCRIBE_MODEL, '@cf/openai/whisper-large-v3-turbo'), {
        audio: toBase64(bytes),
        language,
        initial_prompt: DISFLUENT_PROMPT,
      })) as { text?: string } | null
      if (typeof data?.text !== 'string') throw new Error('empty response')
      const words = timedWordsOf(data)
      return words ? { text: data.text, words } : { text: data.text }
    }
    default:
      throw new Error('unsupported')
  }
}

export async function transcribeWithFallback(
  order: ProviderId[],
  env: Env,
  file: Blob,
  language: string,
): Promise<{ provider: ProviderId | null; text: string; words?: TimedWord[]; attempts: Attempt[] }> {
  const attempts: Attempt[] = []
  const now = Date.now()
  // Recently failed providers are skipped, unless that would leave nothing to try.
  const available = order.filter(
    (provider) => !isDown(provider, now) && !isDown(`${provider}|${transcribeModelFor(provider, env)}`, now),
  )
  for (const provider of available.length ? available : order.slice(0, 1)) {
    try {
      const result = await transcribeWith(provider, env, file, language)
      const text = cleanTranscript(result.text)
      // A silence hallucination carries no words either.
      return text && result.words ? { provider, text, words: result.words, attempts } : { provider, text, attempts }
    } catch (error) {
      const model = transcribeModelFor(provider, env)
      attempts.push({ provider, model, error: String((error as Error)?.message ?? error) })
      markFailure(provider, model, error, now)
    }
  }
  return { provider: null, text: '', attempts }
}
