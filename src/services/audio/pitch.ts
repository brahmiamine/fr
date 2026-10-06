/**
 * Pitch of the learner's own voice, measured in the browser, to put it next to
 * the model's curve ("on copie une forme, pas des Hz"): semitones from the
 * speaker's median, null where the voice is silent or unvoiced — the same
 * shape as `ProsodyExercise.pitch`.
 */

export interface PitchCurve {
  /** Seconds between two values. */
  step: number
  semitones: Array<number | null>
}

const MIN_HZ = 70
const MAX_HZ = 400

/** Autocorrelation pitch of one frame, or null when it is not clearly voiced. */
export function framePitch(frame: Float32Array, sampleRate: number): number | null {
  let energy = 0
  for (let i = 0; i < frame.length; i += 1) energy += frame[i] * frame[i]
  if (energy / frame.length < 1e-5) return null

  const minLag = Math.floor(sampleRate / MAX_HZ)
  const maxLag = Math.min(frame.length - 1, Math.floor(sampleRate / MIN_HZ))
  let bestLag = -1
  let best = 0
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let sum = 0
    for (let i = 0; i + lag < frame.length; i += 1) sum += frame[i] * frame[i + lag]
    if (sum > best) {
      best = sum
      bestLag = lag
    }
  }
  // Voiced speech correlates strongly with itself one period later.
  if (bestLag < 0 || best / energy < 0.45) return null
  return sampleRate / bestLag
}

/** One pitch value every `step` seconds, in semitones around the median. */
export function pitchCurve(samples: Float32Array, sampleRate: number, step = 0.1): PitchCurve {
  const hop = Math.round(step * sampleRate)
  const size = Math.min(Math.round(0.04 * sampleRate), samples.length)
  const hertz: Array<number | null> = []
  for (let start = 0; start + size <= samples.length; start += hop) {
    hertz.push(framePitch(samples.subarray(start, start + size), sampleRate))
  }
  const voiced = hertz.filter((value): value is number => value !== null).sort((a, b) => a - b)
  if (voiced.length === 0) return { step, semitones: hertz.map(() => null) }
  const median = voiced[Math.floor(voiced.length / 2)]
  return {
    step,
    semitones: hertz.map((value) => (value === null ? null : 12 * Math.log2(value / median))),
  }
}

/** Decodes a recording and measures its pitch; null when the browser cannot. */
export async function pitchOfRecording(url: string, step = 0.1): Promise<PitchCurve | null> {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Context) return null
    const context = new Context()
    try {
      const data = await (await fetch(url)).arrayBuffer()
      const buffer = await context.decodeAudioData(data)
      return pitchCurve(buffer.getChannelData(0), buffer.sampleRate, step)
    } finally {
      void context.close()
    }
  } catch {
    return null
  }
}

/** Keeps the stretch between the first and last voiced values. */
export function trimUnvoiced(values: ReadonlyArray<number | null>): Array<number | null> {
  const first = values.findIndex((value) => value !== null)
  if (first === -1) return []
  let last = values.length - 1
  while (values[last] === null) last -= 1
  return values.slice(first, last + 1)
}

/** Cuts a curve to a [start, end] range in seconds (the imitation segment). */
export function slicePitch(curve: PitchCurve, start: number, end: number): PitchCurve {
  const first = Math.max(0, Math.round(start / curve.step))
  const last = Math.min(curve.semitones.length, Math.round(end / curve.step) + 1)
  return { step: curve.step, semitones: curve.semitones.slice(first, last) }
}

/** `count` values along the whole curve, so two curves of different length can be laid over each other. */
export function resample(values: ReadonlyArray<number | null>, count: number): Array<number | null> {
  if (values.length === 0 || count <= 0) return []
  return Array.from({ length: count }, (_, index) => {
    const position = (index / Math.max(1, count - 1)) * (values.length - 1)
    const low = Math.floor(position)
    const high = Math.min(values.length - 1, Math.ceil(position))
    const a = values[low]
    const b = values[high]
    if (a === null || b === null) return a ?? b
    return a + (b - a) * (position - low)
  })
}

/**
 * Dynamic time warping distance between two melodies, in semitones per step:
 * 0 means the same shape, however differently the two were paced. Unvoiced
 * gaps are ignored; null when either curve has no voiced value.
 */
export function dtwDistance(
  a: ReadonlyArray<number | null>,
  b: ReadonlyArray<number | null>,
): number | null {
  const x = a.filter((value): value is number => value !== null)
  const y = b.filter((value): value is number => value !== null)
  if (x.length === 0 || y.length === 0) return null
  const cost = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(Infinity))
  cost[0][0] = 0
  for (let i = 1; i <= x.length; i += 1) {
    for (let j = 1; j <= y.length; j += 1) {
      const d = Math.abs(x[i - 1] - y[j - 1])
      cost[i][j] = d + Math.min(cost[i - 1][j], cost[i][j - 1], cost[i - 1][j - 1])
    }
  }
  return Math.round((cost[x.length][y.length] / (x.length + y.length)) * 100) / 100
}

/** How the voice ends: the last third against the third before it. */
export function finalMovement(values: ReadonlyArray<number | null>): 'rise' | 'fall' | 'level' | null {
  const voiced = trimUnvoiced(values).filter((value): value is number => value !== null)
  if (voiced.length < 6) return null
  const third = Math.floor(voiced.length / 3)
  const mean = (list: number[]) => list.reduce((sum, value) => sum + value, 0) / list.length
  const delta = mean(voiced.slice(-third)) - mean(voiced.slice(-2 * third, -third))
  if (delta >= 1.5) return 'rise'
  if (delta <= -1.5) return 'fall'
  return 'level'
}

/** Pitch range in semitones (10th to 90th percentile): how flat the voice is. */
export function pitchRange(values: ReadonlyArray<number | null>): number | null {
  const voiced = values.filter((value): value is number => value !== null).sort((a, b) => a - b)
  if (voiced.length < 5) return null
  const low = voiced[Math.floor(voiced.length * 0.1)]
  const high = voiced[Math.floor(voiced.length * 0.9)]
  return Math.round((high - low) * 10) / 10
}
