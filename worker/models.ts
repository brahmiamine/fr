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
  // Free tier of Google AI Studio. Gemini 3 thinks by default: "minimal" keeps
  // the whole budget for the answer (thinkingBudget: 0 is refused by 3.x).
  gemini: [
    { id: 'gemini-3.5-flash-lite', extra: { thinkingConfig: { thinkingLevel: 'minimal' } } },
    { id: 'gemini-3.1-flash-lite' },
    { id: 'gemini-flash-lite-latest' },
  ],
  // Groq free plan: Llama models were removed from it.
  groq: [
    { id: 'qwen/qwen3.8-27b', extra: { reasoning_effort: 'none' } },
    { id: 'openai/gpt-oss-120b', extra: { reasoning_effort: 'low' }, minTokens: 600 },
    { id: 'openai/gpt-oss-20b', extra: { reasoning_effort: 'low' }, minTokens: 600 },
  ],
  // Mistral "Experiment" plan (free, about 1 request per second).
  mistral: [
    { id: 'mistral-small-latest' },
    { id: 'ministral-14b-latest' },
    { id: 'ministral-8b-latest' },
  ],
  // Workers AI: free daily allowance of 10,000 neurons.
  cloudflare: [
    { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' },
    { id: '@cf/mistralai/mistral-small-3.1-24b-instruct' },
    { id: '@cf/meta/llama-3.1-8b-instruct-fast' },
  ],
  // ":free" routes only.
  openrouter: [
    { id: 'qwen/qwen3.8-27b:free', extra: { reasoning: { enabled: false } } },
    { id: 'google/gemma-4-31b-it:free', extra: { reasoning: { enabled: false } } },
    { id: 'openrouter/free', extra: { reasoning: { exclude: true } }, minTokens: 600 },
  ],
  // NVIDIA API catalog (free developer access).
  nvidia: [
    { id: 'google/gemma-4-31b-it' },
    { id: 'z-ai/glm-5.3-flash' },
    { id: 'openai/gpt-oss-20b', extra: { reasoning_effort: 'low' }, minTokens: 600 },
  ],
  // Hugging Face router: small free monthly credit.
  huggingface: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct' },
    { id: 'Qwen/Qwen3-Next-80B-A3B-Instruct' },
  ],
  // Cohere trial key (free, 1,000 calls a month).
  cohere: [
    { id: 'command-a-plus-05-2026' },
    { id: 'command-r-08-2024' },
  ],
}
