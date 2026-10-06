import { finalMovement, pitchOfRecording, pitchRange } from '../../services/audio/pitch'
import { analyzeSpeechActivity } from '../../services/audio/speechActivity'
import checkData from '../../data/prosody-check.json'

export type ProsodyCheckKind = 'S0' | 'S4' | 'S8'

export type CheckItemKind = 'imitation' | 'reading' | 'story' | 'argument'

export interface CheckMeasures {
  /** Pauses of 250 ms or more. */
  pauses250?: number
  meanPauseSeconds?: number
  /** Pitch range in semitones (10th–90th percentile): how flat the voice is. */
  pitchRange?: number
  finalMovement?: 'rise' | 'fall' | 'level' | null
}

export interface CheckItem {
  id: string
  kind: CheckItemKind
  prompt: string
  audioId: string
  measures: CheckMeasures | null
}

export interface ProsodyCheckRecord {
  id: string
  kind: ProsodyCheckKind
  date: string
  items: CheckItem[]
}

export interface BlindRating {
  comprehensibility: number
  accent: number
  naturalness: number
}

export const CHECK_PROMPTS = checkData as unknown as {
  phrases: string[]
  readingText: string
  storyPrompt: string
  argumentPrompt: string
}

/** The next bilan to run: S0, then S4, then S8 (each at most once). */
export function nextCheckKind(done: readonly ProsodyCheckKind[]): ProsodyCheckKind | null {
  if (!done.includes('S0')) return 'S0'
  if (!done.includes('S4')) return 'S4'
  if (!done.includes('S8')) return 'S8'
  return null
}

/** Decodes the recording and measures pauses (≥ 250 ms) and the pitch shape. */
export async function measureRecording(url: string): Promise<CheckMeasures | null> {
  const [activity, pitch] = await Promise.all([
    activityOfRecording(url),
    pitchOfRecording(url),
  ])
  if (!activity && !pitch) return null
  return {
    pauses250: activity?.shortPauses,
    meanPauseSeconds: activity?.meanPauseSeconds,
    pitchRange: pitch ? pitchRange(pitch.semitones) ?? undefined : undefined,
    finalMovement: pitch ? finalMovement(pitch.semitones) : null,
  }
}

/** RMS levels per frame, decoded from the recording, then analysed for pauses. */
async function activityOfRecording(
  url: string,
  frameSeconds = 0.05,
): Promise<ReturnType<typeof analyzeSpeechActivity>> {
  try {
    const Context =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Context) return null
    const context = new Context()
    try {
      const data = await (await fetch(url)).arrayBuffer()
      const buffer = await context.decodeAudioData(data)
      const samples = buffer.getChannelData(0)
      const frame = Math.max(1, Math.round(frameSeconds * buffer.sampleRate))
      const levels: number[] = []
      for (let start = 0; start < samples.length; start += frame) {
        const end = Math.min(samples.length, start + frame)
        let sum = 0
        for (let i = start; i < end; i += 1) sum += samples[i] * samples[i]
        levels.push(Math.sqrt(sum / (end - start)))
      }
      return analyzeSpeechActivity(levels, { frameSeconds })
    } finally {
      void context.close()
    }
  } catch {
    return null
  }
}
