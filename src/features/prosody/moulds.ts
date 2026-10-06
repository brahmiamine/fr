import type { ProsodyExercise } from './types'

/** Discourse markers worth reusing, as they are said in conversation. */
const MARKERS = ['en fait', 'du coup', 'par contre', 'enfin', 'franchement', 'finalement', 'bon', 'ben', 'après']

/**
 * The "moules" of an excerpt: the melodic patterns to reuse when the learner
 * retells it in their own words — a continuation rise, a firm falling end, a
 * dislocation, a marker. Derived from what the speaker really does.
 */
export function retellingMoulds(exercise: ProsodyExercise): string[] {
  const moulds: string[] = []
  const groups = exercise.groups
  const text = exercise.transcript.toLowerCase()

  const rise = groups.slice(0, -1).find((group) => group.intonation === 'rise' && group.intonationMeasured !== false)
  if (rise) moulds.push(`Une montée de continuation après « ${rise.text.trim()} » : la voix monte, tu n'as pas fini.`)

  const last = groups[groups.length - 1]
  if (last && last.intonation === 'fall') {
    moulds.push('Une finale qui descend net : la dernière syllabe est longue et basse, point final.')
  }

  const dislocation = groups.find((group, index) => index < groups.length - 1 && /^(moi|toi|lui|elle|nous|vous|eux|ça|ce \w+|cette \w+)\b[^,]*,?$/i.test(group.text.trim()) && group.text.split(/\s+/).length <= 4)
  if (dislocation) moulds.push(`Une dislocation, comme « ${dislocation.text.trim()}… » : l'élément détaché, puis une montée.`)

  const marker = MARKERS.find((item) => new RegExp(`(^|[^\\p{L}])${item}([^\\p{L}]|$)`, 'u').test(text))
  if (marker) moulds.push(`Un marqueur : « ${marker} ».`)

  if (moulds.length === 0) {
    moulds.push('Une montée de continuation avant « mais » ou « parce que ».')
    moulds.push('Une finale qui descend net, avec la dernière syllabe allongée.')
  }
  return moulds
}

/** One mould at first, three after 5 sessions, then free (up to three suggested). */
export function mouldsForLevel(moulds: readonly string[], completedProsodySessions: number): string[] {
  if (completedProsodySessions < 5) return moulds.slice(0, 1)
  return moulds.slice(0, 3)
}
