/**
 * Estimated timings for synthetic (TTS) prosody models.
 *
 * Browser speech synthesis gives no word timestamps, so the duration of each
 * rhythmic group is estimated from its syllable count and the model speed.
 * This keeps the 10–30 s / 5–15 s protocol honest: a group can no longer
 * pretend to last 4 s when it only contains one word.
 *
 * No imports on purpose: `scripts/estimate-prosody-timings.mjs` loads this
 * file directly with Node.
 */

export type TimingSpeed = 'slow' | 'normal' | 'fast'

export interface TimingGroup {
  text: string
  start: number
  end: number
  intonation: 'level' | 'rise' | 'fall'
}

/** Approximate spoken syllables per second for each model speed. */
export const SYLLABLES_PER_SECOND: Record<TimingSpeed, number> = {
  slow: 4.2,
  normal: 5,
  fast: 5.8,
}

/** Pause after a group: longer after a falling (sentence-final) group. */
export const GROUP_PAUSE_SECONDS = 0.3
export const SENTENCE_PAUSE_SECONDS = 0.6

const VOWEL_GROUP = /[aeiouyàâäéèêëîïôöùûüœæ]+/gi

/**
 * Rough count of spoken French syllables: vowel groups, minus a mute final
 * "e"/"es" on words of two or more groups ("bonne", "applique"). Good enough
 * to estimate a duration within ~15 %.
 */
export function countSyllables(text: string): number {
  const words = text
    .toLowerCase()
    .replace(/[’']/g, '')
    .split(/[^a-zàâäéèêëîïôöùûüœæç]+/)
    .filter(Boolean)

  let total = 0
  for (const word of words) {
    let count = (word.match(VOWEL_GROUP) ?? []).length
    if (count > 1 && /([^aeiouyàâäéèêëîïôöùûüœæ]|qu|gu)es?$/.test(word)) count -= 1
    total += Math.max(1, count)
  }
  return total
}

export function estimateGroupSeconds(text: string, speed: TimingSpeed = 'normal'): number {
  const rate = SYLLABLES_PER_SECOND[speed] ?? SYLLABLES_PER_SECOND.normal
  return countSyllables(text) / rate
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/** Re-time groups sequentially from their syllable counts. */
export function estimateGroupTimings<T extends TimingGroup>(
  groups: readonly T[],
  speed: TimingSpeed = 'normal',
): T[] {
  let cursor = 0
  return groups.map((group, index) => {
    const start = round(cursor)
    const end = round(cursor + estimateGroupSeconds(group.text, speed))
    const isLast = index === groups.length - 1
    cursor = end + (isLast ? 0 : group.intonation === 'fall' ? SENTENCE_PAUSE_SECONDS : GROUP_PAUSE_SECONDS)
    return { ...group, start, end }
  })
}

/**
 * Imitation segment: the first sentence (up to the first falling group), then
 * extended group by group until it lasts at least `minSeconds`, without
 * exceeding `maxSeconds`.
 */
export function chooseImitationSegment(
  groups: readonly TimingGroup[],
  minSeconds = 5,
  maxSeconds = 15,
): { start: number; end: number } {
  if (groups.length === 0) return { start: 0, end: 0 }
  const firstFall = groups.findIndex((group) => group.intonation === 'fall')
  let lastIndex = firstFall === -1 ? groups.length - 1 : firstFall
  const start = groups[0].start
  while (
    groups[lastIndex].end - start < minSeconds &&
    lastIndex + 1 < groups.length &&
    groups[lastIndex + 1].end - start <= maxSeconds
  ) {
    lastIndex += 1
  }
  return { start, end: groups[lastIndex].end }
}

/** Seconds of speech per syllable for a group, used to detect fake timings. */
export function secondsPerSyllable(group: TimingGroup): number {
  return (group.end - group.start) / countSyllables(group.text)
}
