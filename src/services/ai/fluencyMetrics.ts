import type { SpeechActivity } from '../audio/speechActivity'

/** A transcribed word and its position in the recording, in seconds. */
export interface TimedWord {
  word: string
  start: number
  end: number
}

/**
 * Measures sent with a transcript to the fluency coach. They are computed
 * here, never by the model: a free model counts badly, and a transcript alone
 * cannot tell a 0.3 s hesitation from a 4 s one.
 */
export interface FluencyMetrics {
  words: number
  durationSeconds?: number
  wordsPerMinute?: number
  /** Bare "euh", "hum". */
  fillers: number
  /** French markers that do the job of a hesitation ("en fait", "disons"…). */
  markers: number
  /** Immediate repetitions and restarts ("je je", "que… que", "je pense je pense"). */
  restarts: number
  longPauses?: number
  longestPauseSeconds?: number
  /** Silences ≥ 1 s inside a clause — an estimate from the word timestamps. */
  midClausePauses?: number
  betweenClausePauses?: number
  startDelaySeconds?: number
  longestSpeechSeconds?: number
}

const FILLER = /(?:^|[^\p{L}])(?:euh+|heu+|hum+|hmm+|mmh+)(?=$|[^\p{L}])/giu
const MARKER =
  /(?:^|[^\p{L}])(?:disons|en fait|comment dire|du coup|tu vois|vous voyez|enfin|bon|ben|bah|bref|voilà|genre|en gros)(?=$|[^\p{L}])/giu

/** Bare hesitations ("euh", "hum"…) found in a transcript. */
export function countFillers(text: string): number {
  return text.match(FILLER)?.length ?? 0
}

/**
 * French discourse markers that do the job of a hesitation ("disons", "en
 * fait", "bon", "ben"…): the goal is more of these and fewer bare "euh".
 */
export function countMarkers(text: string): number {
  return text.match(MARKER)?.length ?? 0
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

const HESITATION_TOKEN = /^(?:euh+|heu+|hum+|hmm+|mmh+)$/
/** Pronouns legitimately doubled in French ("nous nous voyons", "vous vous trompez"). */
const LEGIT_DOUBLES = new Set(['nous', 'vous'])

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}'’-]+/u)
    .map((token) => token.replace(/^['’-]+|['’-]+$/g, ''))
    .filter((token) => token && !HESITATION_TOKEN.test(token))
}

/**
 * Restarts heard in a transcript that kept its hesitations: a word or a pair
 * of words said twice in a row ("je… je pense", "c'est que c'est que").
 */
export function countRestarts(text: string): number {
  const words = tokens(text)
  let restarts = 0
  let index = 0
  while (index < words.length - 1) {
    if (
      index + 3 < words.length &&
      words[index] === words[index + 2] &&
      words[index + 1] === words[index + 3]
    ) {
      restarts += 1
      index += 4
    } else if (words[index] === words[index + 1] && !LEGIT_DOUBLES.has(words[index])) {
      restarts += 1
      index += 2
    } else {
      index += 1
    }
  }
  return restarts
}

/** Words that usually open a new clause: a silence just before them is a boundary pause. */
const CLAUSE_STARTERS = new Set([
  'et', 'mais', 'donc', 'alors', 'puis', 'parce', 'car', 'quand', 'si', 'ensuite',
  'enfin', 'bref', 'bon', 'après', 'sinon', 'pourtant', 'cependant', 'comme',
  'puisque', 'lorsque', 'ou', 'par', 'd’ailleurs', "d'ailleurs", 'moi', 'voilà',
])

function bare(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}']+|[^\p{L}']+$/gu, '')
}

/**
 * Silences ≥ `minSeconds` between two timed words, split into "between two
 * clauses" (punctuation before, or a clause opener after) and "inside a
 * clause". A heuristic: Whisper word timestamps are approximate.
 */
export function classifyPauses(
  words: readonly TimedWord[],
  minSeconds = 1,
): { long: number; mid: number; between: number; longest: number } {
  let long = 0
  let mid = 0
  let between = 0
  let longest = 0
  for (let index = 0; index < words.length - 1; index += 1) {
    const gap = words[index + 1].start - words[index].end
    longest = Math.max(longest, gap)
    if (gap < minSeconds) continue
    long += 1
    const boundary =
      /[.,;:!?…]$/.test(words[index].word.trim()) || CLAUSE_STARTERS.has(bare(words[index + 1].word))
    if (boundary) between += 1
    else mid += 1
  }
  return { long, mid, between, longest: Math.round(longest * 10) / 10 }
}

export function computeFluencyMetrics(input: {
  transcript: string
  words?: readonly TimedWord[] | null
  activity?: SpeechActivity | null
}): FluencyMetrics {
  const { transcript, activity } = input
  const timed = input.words && input.words.length > 1 ? input.words : null
  const words = countWords(transcript)
  const metrics: FluencyMetrics = {
    words,
    fillers: countFillers(transcript),
    markers: countMarkers(transcript),
    restarts: countRestarts(transcript),
  }

  const duration =
    activity?.spokenSeconds ??
    (timed ? timed[timed.length - 1].end - timed[0].start : undefined)
  if (duration && duration > 0) {
    metrics.durationSeconds = Math.round(duration)
    metrics.wordsPerMinute = Math.round(words / (duration / 60))
  }

  if (timed) {
    const pauses = classifyPauses(timed)
    metrics.longPauses = pauses.long
    metrics.longestPauseSeconds = pauses.longest
    metrics.midClausePauses = pauses.mid
    metrics.betweenClausePauses = pauses.between
  } else if (activity) {
    metrics.longPauses = activity.longPauses
    if (activity.longestPauseSeconds !== undefined) {
      metrics.longestPauseSeconds = activity.longestPauseSeconds
    }
  }
  if (activity) {
    metrics.startDelaySeconds = activity.startDelaySeconds
    metrics.longestSpeechSeconds = activity.longestSpeechSeconds
  }
  return metrics
}
