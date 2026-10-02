/**
 * Objective fluency measures computed on the microphone level, entirely in the
 * browser: time before the first sound, silences longer than 1 s, longest
 * continuous speech and the share of time spent speaking.
 *
 * Input: one RMS level per frame (e.g. every 50 ms) for the whole recording.
 */

export interface SpeechActivity {
  startDelaySeconds: number
  longPauses: number
  longestSpeechSeconds: number
  speechRatio: number
}

export interface SpeechActivityOptions {
  frameSeconds?: number
  /** Silences at least this long count as a long pause (method: > 1 s). */
  longPauseSeconds?: number
  /** Shorter silences (stops, breathing) do not split a speech segment. */
  minGapSeconds?: number
}

/**
 * Speech threshold adapted to the room: well above the background noise
 * (low percentile) but below the loud parts of the voice.
 */
export function speechThreshold(levels: readonly number[]): number {
  if (levels.length === 0) return Infinity
  const sorted = [...levels].sort((a, b) => a - b)
  const noise = sorted[Math.floor(sorted.length * 0.1)] ?? 0
  const loud = sorted[Math.floor(sorted.length * 0.9)] ?? 0
  return Math.max(noise * 2.5, noise + (loud - noise) * 0.25, 0.01)
}

export function analyzeSpeechActivity(
  levels: readonly number[],
  options: SpeechActivityOptions = {},
): SpeechActivity | null {
  const frameSeconds = options.frameSeconds ?? 0.05
  const longPauseSeconds = options.longPauseSeconds ?? 1
  const minGapSeconds = options.minGapSeconds ?? 0.3
  if (levels.length === 0) return null

  const threshold = speechThreshold(levels)
  const speaking = levels.map((level) => level >= threshold)
  const firstSpeech = speaking.indexOf(true)
  if (firstSpeech === -1) return null

  let lastSpeech = speaking.length - 1
  while (lastSpeech > firstSpeech && !speaking[lastSpeech]) lastSpeech -= 1

  let longPauses = 0
  let longestSpeechFrames = 0
  let segmentStart = firstSpeech
  let silenceFrames = 0
  let speechFrames = 0

  for (let index = firstSpeech; index <= lastSpeech; index += 1) {
    if (speaking[index]) {
      speechFrames += 1
      if (silenceFrames * frameSeconds >= minGapSeconds) {
        // The gap ended a segment.
        if (silenceFrames * frameSeconds >= longPauseSeconds) longPauses += 1
        segmentStart = index
      }
      silenceFrames = 0
      longestSpeechFrames = Math.max(longestSpeechFrames, index - segmentStart + 1)
    } else {
      silenceFrames += 1
    }
  }

  const round = (value: number) => Math.round(value * 10) / 10
  return {
    startDelaySeconds: round(firstSpeech * frameSeconds),
    longPauses,
    longestSpeechSeconds: round(longestSpeechFrames * frameSeconds),
    speechRatio: Math.round((speechFrames / (lastSpeech - firstSpeech + 1)) * 100) / 100,
  }
}
