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

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const step = 0x8000
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step))
  }
  return btoa(binary)
}

async function multipartTranscription(
  url: string,
  key: string,
  model: string,
  file: Blob,
  language: string,
): Promise<string> {
  const form = new FormData()
  form.append('file', file, 'audio.webm')
  form.append('model', model)
  form.append('language', language)
  form.append('response_format', 'json')
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: { authorization: `Bearer ${key}` },
    body: form,
  })
  if (!response.ok) {
    throw new ProviderError(response.status, (await response.text().catch(() => '')).slice(0, 300))
  }
  const data = (await response.json()) as { text?: string }
  if (typeof data.text !== 'string') throw new Error('empty response')
  return data.text
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
): Promise<string> {
  switch (provider) {
    case 'groq':
      return multipartTranscription(
        'https://api.groq.com/openai/v1/audio/transcriptions',
        env.GROQ_API_KEY as string,
        transcribeModel(env.GROQ_TRANSCRIBE_MODEL, 'whisper-large-v3-turbo'),
        file,
        language,
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
      return text
    }
    case 'cloudflare': {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const data = (await runCloudflare(env, transcribeModel(env.CLOUDFLARE_TRANSCRIBE_MODEL, '@cf/openai/whisper-large-v3-turbo'), {
        audio: toBase64(bytes),
        language,
      })) as { text?: string } | null
      if (typeof data?.text !== 'string') throw new Error('empty response')
      return data.text
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
): Promise<{ provider: ProviderId | null; text: string; attempts: Attempt[] }> {
  const attempts: Attempt[] = []
  const now = Date.now()
  // Recently failed providers are skipped, unless that would leave nothing to try.
  const available = order.filter(
    (provider) => !isDown(provider, now) && !isDown(`${provider}|${transcribeModelFor(provider, env)}`, now),
  )
  for (const provider of available.length ? available : order.slice(0, 1)) {
    try {
      const text = cleanTranscript(await transcribeWith(provider, env, file, language))
      return { provider, text, attempts }
    } catch (error) {
      const model = transcribeModelFor(provider, env)
      attempts.push({ provider, model, error: String((error as Error)?.message ?? error) })
      markFailure(provider, model, error, now)
    }
  }
  return { provider: null, text: '', attempts }
}
