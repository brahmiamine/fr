import type { ProsodyExercise, ProsodyGroup } from './types'

export type Intonation = ProsodyGroup['intonation']

export interface LearnerMarking {
  /** Word indexes after which the learner placed a `/`. */
  boundaries: number[]
  /** One intonation per learner group (same order as the groups). */
  intonations: Intonation[]
}

export interface MarkingComparison {
  found: number
  missed: number
  extra: number
  total: number
  /** Intonations matching the model on groups whose span is identical. */
  intonationMatches: number
  intonationCompared: number
}

export function groupWords(group: Pick<ProsodyGroup, 'text'>): string[] {
  return group.text.split(/\s+/).filter(Boolean)
}

/** Words of the excerpt, in order, without punctuation clues. */
export function exerciseWords(exercise: Pick<ProsodyExercise, 'groups'>): string[] {
  return exercise.groups.flatMap(groupWords)
}

/**
 * Estimated start/end (seconds) of each word, in the order of `exerciseWords`.
 * A group's duration is shared between its words by length, which is close enough
 * to follow the voice word by word.
 */
export function wordTimeline(
  exercise: Pick<ProsodyExercise, 'groups'>,
): { start: number; end: number }[] {
  return exercise.groups.flatMap((group) => {
    const words = groupWords(group)
    const weights = words.map((word) => word.length + 1)
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    let cursor = group.start
    return words.map((_, index) => {
      const start = cursor
      cursor += ((group.end - group.start) * weights[index]) / total
      return { start, end: cursor }
    })
  })
}

/** Index of the word being spoken at `time`, or -1 before the first word. */
export function activeWordIndex(
  exercise: Pick<ProsodyExercise, 'groups'>,
  time: number,
): number {
  const timeline = wordTimeline(exercise)
  let active = -1
  timeline.forEach((word, index) => {
    if (word.start <= time) active = index
  })
  return active
}

/** Word indexes after which the model starts a new rhythmic group. */
export function referenceBoundaries(exercise: Pick<ProsodyExercise, 'groups'>): number[] {
  const boundaries: number[] = []
  let count = 0
  exercise.groups.forEach((group, index) => {
    count += groupWords(group).length
    if (index < exercise.groups.length - 1) boundaries.push(count - 1)
  })
  return boundaries
}

/** [firstWord, lastWord] spans produced by a list of boundaries. */
export function spansFromBoundaries(
  wordCount: number,
  boundaries: readonly number[],
): Array<[number, number]> {
  const sorted = [...new Set(boundaries)]
    .filter((index) => index >= 0 && index < wordCount - 1)
    .sort((a, b) => a - b)
  const spans: Array<[number, number]> = []
  let start = 0
  for (const boundary of sorted) {
    spans.push([start, boundary])
    start = boundary + 1
  }
  if (wordCount > 0) spans.push([start, wordCount - 1])
  return spans
}

export function compareMarking(
  exercise: Pick<ProsodyExercise, 'groups'>,
  marking: LearnerMarking,
): MarkingComparison {
  const reference = referenceBoundaries(exercise)
  const learner = new Set(marking.boundaries)
  const found = reference.filter((index) => learner.has(index)).length

  const wordCount = exerciseWords(exercise).length
  const referenceSpans = spansFromBoundaries(wordCount, reference)
  const learnerSpans = spansFromBoundaries(wordCount, marking.boundaries)
  let intonationMatches = 0
  let intonationCompared = 0
  learnerSpans.forEach((span, learnerIndex) => {
    const referenceIndex = referenceSpans.findIndex(
      ([start, end]) => start === span[0] && end === span[1],
    )
    if (referenceIndex === -1) return
    intonationCompared += 1
    const learnerIntonation = marking.intonations[learnerIndex] ?? 'level'
    if (learnerIntonation === exercise.groups[referenceIndex]?.intonation) {
      intonationMatches += 1
    }
  })

  return {
    found,
    missed: reference.length - found,
    extra: [...learner].filter((index) => !reference.includes(index)).length,
    total: reference.length,
    intonationMatches,
    intonationCompared,
  }
}
