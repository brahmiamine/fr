import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecorderStatus } from '../../../hooks/useAudioRecorder'

export interface ProsodyRecording {
  blob: Blob
  url: string
  durationSeconds: number
}

export interface ProsodyRecorder {
  status: RecorderStatus
  supported: boolean
  current: ProsodyRecording | null
  attempt1: ProsodyRecording | null
  attempt2: ProsodyRecording | null
  recordingSeconds: number
  start: () => Promise<void>
  stop: () => void
  keepAsAttempt1: () => void
  keepAsAttempt2: () => void
  reset: () => void
}

export function useProsodyRecorder(): ProsodyRecorder {
  const supported =
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    'mediaDevices' in navigator

  const [status, setStatus] = useState<RecorderStatus>(
    supported ? 'idle' : 'unsupported',
  )
  const [current, setCurrent] = useState<ProsodyRecording | null>(null)
  const [attempt1, setAttempt1] = useState<ProsodyRecording | null>(null)
  const [attempt2, setAttempt2] = useState<ProsodyRecording | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const urlsRef = useRef<Set<string>>(new Set())
  const startedAtRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const revoke = useCallback((url: string) => {
    URL.revokeObjectURL(url)
    urlsRef.current.delete(url)
  }, [])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }, [])

  const start = useCallback(async () => {
    if (!supported) {
      setStatus('unsupported')
      return
    }

    const activeRecorder = recorderRef.current
    if (activeRecorder && activeRecorder.state !== 'inactive') return

    let stream: MediaStream | null = null
    try {
      setStatus('requesting')
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      setCurrent((latest) => {
        if (latest) revoke(latest.url)
        return null
      })

      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      startedAtRef.current = Date.now()
      setRecordingSeconds(0)
      clearTimer()

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        clearTimer()
        const durationSeconds = Math.max(
          0,
          Math.floor((Date.now() - startedAtRef.current) / 1000),
        )
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        const url = URL.createObjectURL(blob)
        urlsRef.current.add(url)
        setCurrent({ blob, url, durationSeconds })
        setRecordingSeconds(durationSeconds)
        stream?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        recorderRef.current = null
        setStatus('stopped')
      }

      recorder.start()
      recorderRef.current = recorder
      setStatus('recording')
      timerRef.current = setInterval(() => {
        setRecordingSeconds(
          Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)),
        )
      }, 250)
    } catch {
      clearTimer()
      stream?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      recorderRef.current = null
      setStatus('denied')
    }
  }, [supported, revoke, clearTimer])

  const keepAsAttempt1 = useCallback(() => {
    if (!current) return
    if (attempt1) revoke(attempt1.url)
    setAttempt1(current)
    setCurrent(null)
    setRecordingSeconds(0)
    setStatus('idle')
  }, [current, attempt1, revoke])

  const keepAsAttempt2 = useCallback(() => {
    if (!current) return
    if (attempt2) revoke(attempt2.url)
    setAttempt2(current)
    setCurrent(null)
    setRecordingSeconds(0)
    setStatus('idle')
  }, [current, attempt2, revoke])

  const reset = useCallback(() => {
    clearTimer()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    recorderRef.current = null
    streamRef.current = null
    chunksRef.current = []

    for (const url of [...urlsRef.current]) revoke(url)
    setCurrent(null)
    setAttempt1(null)
    setAttempt2(null)
    setRecordingSeconds(0)
    setStatus(supported ? 'idle' : 'unsupported')
  }, [revoke, supported, clearTimer])

  useEffect(() => {
    return () => {
      clearTimer()
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      for (const url of urlsRef.current) URL.revokeObjectURL(url)
      urlsRef.current.clear()
    }
  }, [clearTimer])

  return {
    status,
    supported,
    current,
    attempt1,
    attempt2,
    recordingSeconds,
    start,
    stop,
    keepAsAttempt1,
    keepAsAttempt2,
    reset,
  }
}
