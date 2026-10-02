import prosodyData from '../../data/prosody.json'
import type { ProsodyExercise } from '../../features/prosody/types'
import {
  MAX_FULL_AUDIO_SECONDS,
  MAX_IMITATION_SECONDS,
  MIN_FULL_AUDIO_SECONDS,
  MIN_IMITATION_SECONDS,
} from '../../features/prosody/types'

export const prosodyRepository: readonly ProsodyExercise[] =
  prosodyData as unknown as ProsodyExercise[]

export function prosodyExerciseDuration(exercise: ProsodyExercise): number {
  if (exercise.groups.length === 0) return 0
  return Math.max(...exercise.groups.map((group) => group.end))
}

export function validateProsodyExercise(exercise: ProsodyExercise): string[] {
  const errors: string[] = []
  const duration = prosodyExerciseDuration(exercise)
  const imitationDuration = exercise.imitation.end - exercise.imitation.start

  if (!exercise.ready) errors.push('audio-placeholder')
  const modelKind = exercise.modelKind ?? 'recording'
  if (modelKind === 'recording' && !exercise.audio) errors.push('missing-audio')
  if (modelKind === 'tts' && !exercise.transcript.trim()) errors.push('missing-tts-text')
  if (duration < MIN_FULL_AUDIO_SECONDS || duration > MAX_FULL_AUDIO_SECONDS) {
    errors.push('full-duration')
  }
  if (
    imitationDuration < MIN_IMITATION_SECONDS ||
    imitationDuration > MAX_IMITATION_SECONDS
  ) {
    errors.push('imitation-duration')
  }
  if (
    exercise.imitation.start < 0 ||
    exercise.imitation.end > duration ||
    exercise.imitation.end <= exercise.imitation.start
  ) {
    errors.push('imitation-bounds')
  }

  for (let index = 0; index < exercise.groups.length; index += 1) {
    const group = exercise.groups[index]
    const previous = exercise.groups[index - 1]
    if (group.start < 0 || group.end <= group.start) errors.push('group-bounds')
    if (previous && group.start < previous.end) errors.push('group-overlap')
  }

  return [...new Set(errors)]
}

export function isProsodyExerciseReady(exercise: ProsodyExercise): boolean {
  return validateProsodyExercise(exercise).length === 0
}

export const readyProsodyExercises = prosodyRepository.filter(isProsodyExerciseReady)

export function pickReadyProsodyExercise(
  recentIds: readonly string[],
  random: () => number = Math.random,
): ProsodyExercise | null {
  if (readyProsodyExercises.length === 0) return null
  const fresh = readyProsodyExercises.filter((exercise) => !recentIds.includes(exercise.id))
  const pool = fresh.length > 0 ? fresh : readyProsodyExercises
  return pool[Math.floor(random() * pool.length)] ?? null
}
