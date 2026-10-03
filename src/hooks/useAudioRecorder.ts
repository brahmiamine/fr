import { useCallback, useEffect, useRef, useState } from 'react'
import { analyzeSpeechActivity } from '../services/audio/speechActivity'
import type { SpeechActivity } from '../services/audio/speechActivity'

export type RecorderStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'stopped'
  | 'unsupported'
  | 'denied'

export interface AudioRecorder {
  status: RecorderStatus
  supported: boolean
  blobUrl: string | null
  /** Pauses / start delay measured on the last recording (measureLevels). */
  activity?: SpeechActivity | null
  start: () => Promise<void>
  /** Returns true when a recording was actually running and is now stopping. */
  stop: () => boolean
  reset: () => void
  /** Closes a microphone kept open by `keepStream`. A running recording is left alone. */
  release: () => void
}

export interface AudioRecorderOptions {
  /** Sample the microphone level to measure pauses objectively. */
  measureLevels?: boolean
  /**
   * Keep the microphone open between recordings, so a series of short ones (the
   * four rounds of the 4 → 3 → 2) starts instantly and never re-asks for access.
   * The caller closes it with `release()`.
   */
  keepStream?: boolean
}

const LEVEL_FRAME_MS = 50

type AudioContextConstructor = new () => AudioContext

function audioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === 'undefined') return null
  const candidate =
    (window as unknown as { AudioContext?: AudioContextConstructor }).AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext
  return candidate ?? null
}

/**
 * Session-only audio capture using the MediaRecorder API. The recorded blob
 * lives in memory and is discarded when the session ends — nothing large is
 * ever written to localStorage.
 */
export function useAudioRecorder(options: AudioRecorderOptions = {}): AudioRecorder {
  const measureLevels = options.measureLevels ?? false
  const keepStream = options.keepStream ?? false
  const supported =
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    'mediaDevices' in navigator

  const [status, setStatus] = useState<RecorderStatus>(
    supported ? 'idle' : 'unsupported',
  )
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [activity, setActivity] = useState<SpeechActivity | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  /** True while `getUserMedia` + recorder setup is in flight. */
  const startingRef = useRef(false)
  /** Raised when `stop()` arrives before the microphone has opened. */
  const stopRequestedRef = useRef(false)
  /** Every URL created this session, kept alive for later playback (round replays). */
  const urlsRef = useRef<string[]>([])
  const levelsRef = useRef<number[]>([])
  const meterRef = useRef<{ context: AudioContext; timer: ReturnType<typeof setInterval> } | null>(null)

  const stopMeter = useCallback(() => {
    const meter = meterRef.current
    if (!meter) return
    clearInterval(meter.timer)
    void meter.context.close().catch(() => undefined)
    meterRef.current = null
  }, [])

  const startMeter = useCallback((stream: MediaStream) => {
    levelsRef.current = []
    const Context = audioContextConstructor()
    if (!Context) return
    try {
      const context = new Context()
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      context.createMediaStreamSource(stream).connect(analyser)
      const buffer = new Float32Array(analyser.fftSize)
      const timer = setInterval(() => {
        analyser.getFloatTimeDomainData(buffer)
        let sum = 0
        for (const sample of buffer) sum += sample * sample
        levelsRef.current.push(Math.sqrt(sum / buffer.length))
      }, LEVEL_FRAME_MS)
      meterRef.current = { context, timer }
    } catch {
      meterRef.current = null
    }
  }, [])

  const releaseUrl = useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url)
    urlsRef.current = []
    setBlobUrl(null)
  }, [])

  const stop = useCallback((): boolean => {
    stopRequestedRef.current = true
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop()
      return true
    }
    return false
  }, [])

  const release = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') return
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const start = useCallback(async () => {
    if (!supported) {
      setStatus('unsupported')
      return
    }
    // React mounts the same effect twice in StrictMode, and a round can ask to
    // record again: never open a second microphone over a running capture.
    if (startingRef.current || (recorderRef.current?.state ?? 'inactive') !== 'inactive') {
      stopRequestedRef.current = false
      return
    }
    startingRef.current = true
    stopRequestedRef.current = false
    try {
      setStatus('requesting')
      const reusable = keepStream ? streamRef.current : null
      const stream =
        reusable && reusable.getTracks().some((track) => track.readyState === 'live')
          ? reusable
          : await navigator.mediaDevices.getUserMedia({ audio: true })
      // The round ended while the microphone was opening: release it unwrapped.
      if (stopRequestedRef.current) {
        if (!keepStream) stream.getTracks().forEach((track) => track.stop())
        setStatus('idle')
        return
      }
      streamRef.current = stream

      const chunks: Blob[] = []
      const recorder = new MediaRecorder(stream)
      setActivity(null)
      if (measureLevels) startMeter(stream)

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }

      recorder.onstop = () => {
        if (measureLevels) {
          stopMeter()
          setActivity(
            analyzeSpeechActivity(levelsRef.current, {
              frameSeconds: LEVEL_FRAME_MS / 1000,
            }),
          )
        }
        const blob = new Blob(chunks, {
          type: recorder.mimeType || 'audio/webm',
        })
        const url = URL.createObjectURL(blob)
        urlsRef.current.push(url)
        setBlobUrl(url)
        if (!keepStream) {
          stream.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
        // A newer recording may already have started on the same microphone:
        // only the latest one decides the status.
        if (recorderRef.current === recorder) setStatus('stopped')
      }

      recorder.start()
      recorderRef.current = recorder
      setStatus('recording')
    } catch {
      setStatus('denied')
    }
  }, [supported, measureLevels, keepStream, startMeter, stopMeter])

  // Stop the recorder and release the microphone on unmount.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      stopMeter()
      releaseUrl()
    }
  }, [releaseUrl, stopMeter])

  return { status, supported, blobUrl, activity, start, stop, reset: releaseUrl, release }
}
