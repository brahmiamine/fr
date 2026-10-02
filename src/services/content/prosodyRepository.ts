import prosodyData from '../../data/prosody.json'
import type { ProsodyExercise } from '../../features/prosody/types'

// Prosody exercises are static JSON, imported at build time so they work on
// GitHub Pages without a backend.
export const prosodyRepository: readonly ProsodyExercise[] =
  prosodyData as unknown as ProsodyExercise[]
