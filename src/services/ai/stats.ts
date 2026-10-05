export const AI_STATS_KEY = 'parle-plus-ai-stats'
export const AI_STATS_EVENT = 'parle-plus-ai-stats-changed'

export type AiKind = 'text' | 'audio'

export interface AiUsageStat {
  provider: string
  kind: AiKind
  model: string
  requests: number
  successes: number
  failures: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  /** Audio sent for transcription, in bytes. */
  audioBytes: number
  /** Words returned by transcriptions. */
  words: number
  totalLatencyMs: number
  lastUsed: string | null
}

export type AiStats = Record<string, AiUsageStat>

const keyOf = (provider: string, kind: AiKind) => `${provider}:${kind}`

export function loadAiStats(): AiStats {
  try {
    const raw = window.localStorage.getItem(AI_STATS_KEY)
    const parsed = raw ? (JSON.parse(raw) as AiStats) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function save(stats: AiStats) {
  try {
    window.localStorage.setItem(AI_STATS_KEY, JSON.stringify(stats))
  } catch {
    /* storage unavailable: statistics last for this visit only */
  }
  window.dispatchEvent(new Event(AI_STATS_EVENT))
}

function entry(stats: AiStats, provider: string, kind: AiKind, model = ''): AiUsageStat {
  const key = keyOf(provider, kind)
  const current = stats[key] ?? {
    provider,
    kind,
    model,
    requests: 0,
    successes: 0,
    failures: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    audioBytes: 0,
    words: 0,
    totalLatencyMs: 0,
    lastUsed: null,
  }
  if (model) current.model = model
  stats[key] = current
  return current
}

export interface SuccessRecord {
  provider: string
  kind: AiKind
  model: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  audioBytes?: number
  words?: number
  latencyMs?: number
  /** Providers tried first that did not answer. */
  failed?: string[]
  /** Model each provider was asked to use, by provider id. */
  models?: Record<string, string>
}

export function recordAiSuccess(record: SuccessRecord): void {
  const stats = loadAiStats()
  for (const provider of record.failed ?? []) {
    const failed = entry(stats, provider, record.kind, record.models?.[provider])
    failed.requests += 1
    failed.failures += 1
  }
  const stat = entry(stats, record.provider, record.kind, record.model)
  stat.requests += 1
  stat.successes += 1
  stat.promptTokens += record.promptTokens ?? 0
  stat.completionTokens += record.completionTokens ?? 0
  stat.totalTokens += record.totalTokens ?? 0
  stat.audioBytes += record.audioBytes ?? 0
  stat.words += record.words ?? 0
  stat.totalLatencyMs += record.latencyMs ?? 0
  stat.lastUsed = new Date().toISOString()
  save(stats)
}

export function recordAiFailures(
  providers: string[],
  kind: AiKind,
  models: Record<string, string> = {},
): void {
  if (providers.length === 0) return
  const stats = loadAiStats()
  for (const provider of providers) {
    const stat = entry(stats, provider, kind, models[provider])
    stat.requests += 1
    stat.failures += 1
    stat.lastUsed = new Date().toISOString()
  }
  save(stats)
}

export function clearAiStats(): void {
  try {
    window.localStorage.removeItem(AI_STATS_KEY)
  } catch {
    /* nothing to clear */
  }
  window.dispatchEvent(new Event(AI_STATS_EVENT))
}
