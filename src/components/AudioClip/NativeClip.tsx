import { prosodyRepository } from '../../services/content/prosodyRepository'
import { assetUrl } from '../../services/assets'
import type { NativeClip as NativeClipRef } from '../../types/content'
import { AudioClip } from './AudioClip'

/** The recording of the prosody bank a clip is cut from, or null. */
export function nativeClipSource(clip: NativeClipRef | undefined): { src: string; credit: string } | null {
  if (!clip) return null
  const exercise = prosodyRepository.find((item) => item.id === clip.exerciseId)
  if (!exercise?.audio) return null
  return { src: assetUrl(exercise.audio), credit: exercise.attribution ?? exercise.source }
}

/**
 * A real speaker saying a chunk, cut from the prosody bank: the spoken form
 * and the melody, not the written form read by the synthetic voice.
 */
export function NativeClip({ clip, label = 'Écouter un natif le dire' }: { clip?: NativeClipRef; label?: string }) {
  const source = nativeClipSource(clip)
  if (!clip || !source) return null
  return (
    <div className="native-clip">
      <AudioClip src={source.src} start={clip.start} end={clip.end} label={label} />
      <p className="native-clip__credit muted">Vraie voix · {source.credit}</p>
    </div>
  )
}
