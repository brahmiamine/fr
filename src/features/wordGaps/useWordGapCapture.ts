import { useCallback } from 'react'
import { useOptionalAppState } from '../../app/AppStateProvider'
import {
  NEW_WORD_GAPS_PER_DAY,
  captureWordGap,
  findWordGap,
  newWordGapsToday,
} from '../../services/progress/progress'

export type CaptureResult = 'added' | 'again' | 'limit' | 'invalid' | 'unavailable'

export interface WordGapCapture {
  /** Saves the word right away, without waiting for the end of the session. */
  capture: (word: string, idea: string) => CaptureResult
  /** New words still allowed today (Infinity when not limited). */
  remaining: number
  available: boolean
}

/**
 * Notes a word that was missing while speaking, straight into the personal
 * word gaps. A word already in the list is always accepted (it was missed
 * again); new words are capped per day, unless `limited` is false.
 */
export function useWordGapCapture(limited = true): WordGapCapture {
  const app = useOptionalAppState()
  const state = app?.state
  const updateWith = app?.updateWith
  const remaining = !state
    ? 0
    : limited
      ? Math.max(0, NEW_WORD_GAPS_PER_DAY - newWordGapsToday(state))
      : Infinity

  const capture = useCallback(
    (word: string, idea: string): CaptureResult => {
      if (!state || !updateWith) return 'unavailable'
      const cleanWord = word.trim()
      const cleanIdea = idea.trim()
      if (!cleanWord || !cleanIdea) return 'invalid'
      const known = Boolean(findWordGap(state, cleanWord))
      if (!known && remaining <= 0) return 'limit'
      updateWith((prev) => captureWordGap(prev, cleanWord, cleanIdea, new Date()))
      return known ? 'again' : 'added'
    },
    [state, updateWith, remaining],
  )

  return { capture, remaining, available: Boolean(state) }
}

export const LIMIT_MESSAGE =
  `Tu as déjà noté ${NEW_WORD_GAPS_PER_DAY} nouveaux mots aujourd'hui : chacun doit revenir ` +
  'trois fois, garde les plus utiles pour demain.'
