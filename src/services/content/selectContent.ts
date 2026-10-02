import type { Identifiable } from '../../types/content'

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

/**
 * Fill `count` slots by concatenating ordered priority pools (without
 * shuffling across pools), preserving each pool's priority order, and never
 * duplicating an id. Pools later in the list are only used as a fallback.
 */
export function pickInPriority<T extends Identifiable>(
  pools: readonly (readonly T[])[],
  count: number,
  random: () => number = Math.random,
): T[] {
  const seen = new Set<string>()
  const result: T[] = []

  for (const pool of pools) {
    if (result.length >= count) break
    for (const item of shuffle(pool, random)) {
      if (result.length >= count) break
      if (seen.has(item.id)) continue
      seen.add(item.id)
      result.push(item)
    }
  }

  return result
}
