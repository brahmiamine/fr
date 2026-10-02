import type {
  ContentRepository,
  Identifiable,
  RecentContent,
  SessionContent,
} from '../../types/content'

export const SESSION_SIZES = {
  paraphraseWords: 5,
  questions: 5,
  expressions: 3,
} as const

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Pick up to `count` unique items by id.
 *
 * - Duplicate source ids are removed defensively.
 * - Items that are not in `recentIds` are preferred.
 * - If there are not enough fresh items, recently used items fill the gap.
 * - The result never contains the same id twice.
 */
export function selectUniqueItems<T extends Identifiable>(
  items: readonly T[],
  count: number,
  recentIds: readonly string[] = [],
  random: () => number = Math.random,
): T[] {
  if (count <= 0) return []

  const byId = new Map<string, T>()
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item)
  }
  const unique = [...byId.values()]

  const recent = new Set(recentIds)
  const fresh = shuffle(
    unique.filter((item) => !recent.has(item.id)),
    random,
  )
  const used = shuffle(
    unique.filter((item) => recent.has(item.id)),
    random,
  )

  return [...fresh, ...used].slice(0, count)
}

export function buildSessionContent(
  repository: ContentRepository,
  recent: RecentContent,
  random: () => number = Math.random,
): SessionContent {
  const topics = selectUniqueItems(repository.topics, 1, recent.topicIds, random)
  if (topics.length === 0) {
    throw new Error('Aucun sujet de conversation disponible.')
  }

  return {
    topic: topics[0],
    paraphraseWords: selectUniqueItems(
      repository.paraphraseWords,
      SESSION_SIZES.paraphraseWords,
      recent.wordIds,
      random,
    ),
    questions: selectUniqueItems(
      repository.questions,
      SESSION_SIZES.questions,
      recent.questionIds,
      random,
    ),
    expressions: selectUniqueItems(
      repository.nativeExpressions,
      SESSION_SIZES.expressions,
      recent.expressionIds,
      random,
    ),
  }
}
