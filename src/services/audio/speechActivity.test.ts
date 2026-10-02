import { describe, expect, it } from 'vitest'
import { analyzeSpeechActivity } from './speechActivity'

const SILENCE = 0.005
const VOICE = 0.2

function frames(pattern: Array<[number, number]>): number[] {
  // [level, seconds] pairs at 50 ms per frame.
  return pattern.flatMap(([level, seconds]) =>
    Array.from({ length: Math.round(seconds / 0.05) }, () => level),
  )
}

describe('analyzeSpeechActivity', () => {
  it('measures start delay, long pauses, longest speech and speech ratio', () => {
    const levels = frames([
      [SILENCE, 2], // 2 s before the first word
      [VOICE, 5],
      [SILENCE, 0.2], // short breath: same segment
      [VOICE, 3],
      [SILENCE, 1.5], // long pause
      [VOICE, 4],
      [SILENCE, 0.5], // medium pause: not a long one
      [VOICE, 2],
      [SILENCE, 3], // trailing silence is ignored
    ])
    const result = analyzeSpeechActivity(levels)
    expect(result).not.toBeNull()
    expect(result?.startDelaySeconds).toBe(2)
    expect(result?.longPauses).toBe(1)
    expect(result?.longestSpeechSeconds).toBeCloseTo(8.2, 1)
    expect(result?.speechRatio).toBeGreaterThan(0.85)
  })

  it('returns null when nothing was said', () => {
    expect(analyzeSpeechActivity([])).toBeNull()
    expect(analyzeSpeechActivity(frames([[SILENCE, 3]]))).toBeNull()
  })
})
