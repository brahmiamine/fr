import { countSyllables } from '../../services/content/prosodyTiming'
import type { ProsodyExercise, ProsodyGroup } from './types'

export interface CustomExtractInput {
  audioUrl: string
  transcript: string
  durationSeconds: number
  imitation: { start: number; end: number }
  idea?: string
}

export const CUSTOM_MIN_SECONDS = 10
export const CUSTOM_MAX_SECONDS = 60

/**
 * Rough provisional groups for a learner-imported excerpt: split on
 * punctuation and spread over the real duration by syllable count. They only
 * serve the word list and segment transcript — the learner marks the real
 * grouping by ear.
 */
export function provisionalGroups(transcript: string, durationSeconds: number): ProsodyGroup[] {
  const parts = transcript
    .split(/(?<=[,;:.!?…])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const weights = parts.map((part) => Math.max(1, countSyllables(part)))
  const total = weights.reduce((sum, value) => sum + value, 0) || 1
  let cursor = 0
  return parts.map((part, index) => {
    const start = cursor
    const end = index === parts.length - 1 ? durationSeconds : cursor + (weights[index] / total) * durationSeconds
    cursor = end
    const intonation: ProsodyGroup['intonation'] = /\?$/.test(part)
      ? 'rise'
      : /[.!…]$/.test(part)
        ? 'fall'
        : 'rise'
    return {
      text: part.replace(/[,;:.!?…]+$/, ''),
      start: Math.round(start * 100) / 100,
      end: Math.round(end * 100) / 100,
      intonation,
    }
  })
}

export function validateCustomExtract(input: CustomExtractInput): string[] {
  const errors: string[] = []
  if (!input.audioUrl) errors.push('Choisis un fichier audio.')
  if (input.transcript.trim().split(/\s+/).filter(Boolean).length < 6) {
    errors.push('Colle la transcription exacte de l’extrait (au moins 6 mots).')
  }
  if (input.durationSeconds < CUSTOM_MIN_SECONDS || input.durationSeconds > CUSTOM_MAX_SECONDS) {
    errors.push(`L’extrait doit durer entre ${CUSTOM_MIN_SECONDS} et ${CUSTOM_MAX_SECONDS} s (idéalement 10–30 s).`)
  }
  const segment = input.imitation.end - input.imitation.start
  if (
    input.imitation.start < 0 ||
    input.imitation.end > input.durationSeconds + 0.01 ||
    segment < 5 ||
    segment > 15
  ) {
    errors.push('Le segment d’imitation doit durer entre 5 et 15 s, à l’intérieur de l’extrait.')
  }
  return errors
}

export function buildCustomExercise(input: CustomExtractInput, now: Date = new Date()): ProsodyExercise {
  return {
    id: `custom-${now.getTime()}`,
    level: 'perso',
    category: 'perso',
    modelKind: 'recording',
    audio: input.audioUrl,
    transcript: input.transcript.trim(),
    groups: provisionalGroups(input.transcript, input.durationSeconds),
    imitation: input.imitation,
    retelling: {
      idea: input.idea?.trim() || 'Redis la même idée avec tes propres mots.',
    },
    ready: true,
    source: 'learner-import',
    timing: 'measured',
    custom: true,
  }
}
