import type { ProviderId } from './providers'

/**
 * A model the app may use, with what it needs to answer briefly.
 * Only free models (free tier, ":free" routes or a daily free allowance).
 */
export interface ModelSpec {
  id: string
  /** Extra request fields, e.g. to switch reasoning off on reasoning models. */
  extra?: Record<string, unknown>
  /** Reasoning models spend tokens thinking: never ask them for fewer than this. */
  minTokens?: number
}

/**
 * Candidate models per provider, best first. The first one that answers is used;
 * `GET /api/diagnose` tests them all. Checked against each provider's free
 * offer and live model list (see docs/ai-models.md).
 */
export const MODEL_CATALOG: Record<ProviderId, ModelSpec[]> = {
  gemini: [
    { id: 'gemini-3.5-flash-lite' },
    { id: 'gemini-3.8-flash' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile' },
    { id: 'openai/gpt-oss-120b', extra: { reasoning_effort: 'low' }, minTokens: 600 },
    { id: 'qwen/qwen3.8-27b', extra: { reasoning_effort: 'none' } },
    { id: 'llama-3.1-8b-instant' },
  ],
  mistral: [
    { id: 'mistral-small-latest' },
    { id: 'open-mistral-nemo' },
  ],
  cloudflare: [
    { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
    { id: '@cf/meta/llama-3.1-8b-instruct-fast' },
    { id: '@cf/mistralai/mistral-small-3.1-24b-instruct' },
  ],
  openrouter: [
    { id: 'qwen/qwen3.8-27b:free', extra: { reasoning: { enabled: false } } },
    { id: 'google/gemma-4-31b-it:free', extra: { reasoning: { enabled: false } } },
    { id: 'openrouter/free', extra: { reasoning: { exclude: true } }, minTokens: 600 },
  ],
  nvidia: [
    { id: 'meta/llama-3.3-70b-instruct' },
    { id: 'google/gemma-4-31b-it' },
    { id: 'openai/gpt-oss-20b', extra: { reasoning_effort: 'low' }, minTokens: 600 },
    { id: 'z-ai/glm-5.3' },
  ],
  huggingface: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct' },
  ],
  cohere: [
    { id: 'command-a-plus-05-2026' },
    { id: 'command-r-08-2024' },
  ],
}
