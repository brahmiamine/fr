import { describe, expect, it } from 'vitest'
import { dtwDistance, finalMovement, framePitch, pitchCurve, pitchRange, resample, trimUnvoiced } from './pitch'

const RATE = 16000

function tone(frequencies: number[], secondsEach: number): Float32Array {
  const samples = new Float32Array(Math.round(frequencies.length * secondsEach * RATE))
  let phase = 0
  samples.forEach((_, index) => {
    const frequency = frequencies[Math.min(frequencies.length - 1, Math.floor(index / (secondsEach * RATE)))]
    phase += (2 * Math.PI * frequency) / RATE
    samples[index] = 0.5 * Math.sin(phase)
  })
  return samples
}

describe('framePitch', () => {
  it('finds the frequency of a voiced frame, and nothing in silence', () => {
    const frame = tone([200], 0.04)
    expect(framePitch(frame, RATE)).toBeCloseTo(200, -1)
    expect(framePitch(new Float32Array(640), RATE)).toBeNull()
  })
})

describe('pitchCurve', () => {
  it('follows a rising voice in semitones around its median', () => {
    const curve = pitchCurve(tone([150, 180, 220, 260], 0.5), RATE)
    const voiced = curve.semitones.filter((value): value is number => value !== null)
    expect(voiced.length).toBeGreaterThan(15)
    expect(voiced[voiced.length - 1]).toBeGreaterThan(voiced[0] + 5)
    expect(finalMovement(curve.semitones)).toBe('rise')
  })

  it('tells a falling ending from a flat one', () => {
    expect(finalMovement(pitchCurve(tone([260, 220, 180, 150], 0.5), RATE).semitones)).toBe('fall')
    expect(finalMovement(pitchCurve(tone([200, 200, 200, 200], 0.5), RATE).semitones)).toBe('level')
  })
})

describe('melody comparison', () => {
  it('gives 0 for the same shape at a different pace, and more for a different shape', () => {
    const rise = [0, 1, 2, 3, 4, 5]
    const slowRise = resample(rise, 12)
    expect(dtwDistance(rise, slowRise)).toBeLessThan(0.2)
    expect(dtwDistance(rise, [5, 4, 3, 2, 1, 0])).toBeGreaterThan(1)
    expect(dtwDistance([null, null], rise)).toBeNull()
  })

  it('trims unvoiced edges, resamples and measures a flat voice', () => {
    expect(trimUnvoiced([null, 1, null, 2, null])).toEqual([1, null, 2])
    expect(resample([0, 10], 3)).toEqual([0, 5, 10])
    expect(pitchRange([0, 0.1, -0.1, 0, 0.2, -0.2, 0, 0.1])).toBeLessThan(1)
    expect(pitchRange([-6, -3, 0, 3, 6, -5, 5, 0])).toBeGreaterThan(8)
  })
})
