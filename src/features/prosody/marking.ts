import type { ProsodyExercise, ProsodyGroup } from './types'
import { hasReliableIntonation } from './types'

export type Intonation = ProsodyGroup['intonation']

export interface LearnerMarking {
  /** Word indexes after which the learner placed a `/`. */
  boundaries: number[]
  /** One intonation per learner group (same order as the groups). */
  intonations: Intonation[]
}

export interface MarkingComparison {
  /** False when the model has no reliable boundaries to compare with. */
  scored: boolean
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
 * Start/end (seconds) of each word, in the order of `exerciseWords`: measured
 * when the group carries word timings, otherwise the group's duration is
 * shared between its words by length, close enough to follow the voice.
 */
export function wordTimeline(
  exercise: Pick<ProsodyExercise, 'groups'>,
): { start: number; end: number }[] {
  return exercise.groups.flatMap((group) => {
    const words = groupWords(group)
    if (group.words && group.words.length === words.length) {
      return group.words.map(([start, end]) => ({ start, end }))
    }
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

const ENDS_WITH_PUNCTUATION = /[,;:.!?…]["»)]*$/

/**
 * Boundaries the learner can fairly be scored on:
 * - recordings annotated from the audio: every boundary is a measured pause;
 * - the synthetic voice: only boundaries on punctuation, where it really pauses;
 * - recordings still annotated from punctuation alone: none, it was a guess.
 */
export function scoredBoundaries(
  exercise: Pick<ProsodyExercise, 'groups' | 'modelKind' | 'annotation'>,
): number[] {
  const reference = referenceBoundaries(exercise)
  if (exercise.annotation === 'acoustic') return reference
  if (exercise.modelKind === 'tts') {
    return reference.filter((_, index) => ENDS_WITH_PUNCTUATION.test(exercise.groups[index].text))
  }
  return []
}

export function compareMarking(
  exercise: Pick<ProsodyExercise, 'groups' | 'modelKind' | 'annotation'>,
  marking: LearnerMarking,
): MarkingComparison {
  const allReference = referenceBoundaries(exercise)
  const reference = scoredBoundaries(exercise)
  const learner = new Set(marking.boundaries)
  const found = reference.filter((index) => learner.has(index)).length

  const wordCount = exerciseWords(exercise).length
  const referenceSpans = spansFromBoundaries(wordCount, allReference)
  const learnerSpans = spansFromBoundaries(wordCount, marking.boundaries)
  let intonationMatches = 0
  let intonationCompared = 0
  learnerSpans.forEach((span, learnerIndex) => {
    const referenceIndex = referenceSpans.findIndex(
      ([start, end]) => start === span[0] && end === span[1],
    )
    if (referenceIndex === -1) return
    if (!hasReliableIntonation(exercise, exercise.groups[referenceIndex])) return
    intonationCompared += 1
    const learnerIntonation = marking.intonations[learnerIndex] ?? 'level'
    if (learnerIntonation === exercise.groups[referenceIndex]?.intonation) {
      intonationMatches += 1
    }
  })

  return {
    scored: reference.length > 0,
    found,
    missed: reference.length - found,
    // A mark where the model has an unscored group end is not counted against the learner.
    extra: reference.length > 0
      ? [...learner].filter((index) => !allReference.includes(index)).length
      : 0,
    total: reference.length,
    intonationMatches,
    intonationCompared,
  }
}
