/**
 * Recorded blobs (MediaRecorder) often report an infinite duration until the end
 * has been reached once. Seek far ahead, then back, so the real length is known.
 * `onReady` runs as soon as the duration is finite (immediately when it already is).
 */
export function resolveDuration(audio: HTMLAudioElement, onReady: (seconds: number) => void): void {
  if (Number.isFinite(audio.duration)) {
    onReady(audio.duration)
    return
  }
  const restore = () => {
    audio.removeEventListener('timeupdate', restore)
    audio.currentTime = 0
    if (Number.isFinite(audio.duration)) onReady(audio.duration)
  }
  audio.addEventListener('timeupdate', restore)
  audio.currentTime = 1e101
}
