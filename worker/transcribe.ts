import {
  runCloudflare,
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
      return transcribeModel(env.GEMINI_TRANSCRIBE_MODEL, 'gemini-3.8-flash')
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
    headers: { authorization: `Bearer ${key}` },
    body: form,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = (await response.json()) as { text?: string }
  if (typeof data.text !== 'string') throw new Error('empty response')
  return data.text
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
          transcribeModel(env.GEMINI_TRANSCRIBE_MODEL, 'gemini-3.8-flash'),
        )}:generateContent`,
        {
          method: 'POST',
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
                      'Réponds uniquement par la transcription.',
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
          }),
        },
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
      if (!text?.trim()) throw new Error('empty response')
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
): Promise<{ provider: ProviderId | null; text: string; failed: ProviderId[] }> {
  const failed: ProviderId[] = []
  for (const provider of order) {
    try {
      return { provider, text: await transcribeWith(provider, env, file, language), failed }
    } catch {
      failed.push(provider)
    }
  }
  return { provider: null, text: '', failed }
}
