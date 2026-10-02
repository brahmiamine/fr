import { useCallback, useEffect, useRef, useState } from 'react'
import type { RecorderStatus } from '../../../hooks/useAudioRecorder'

export interface ProsodyRecording {
  blob: Blob
  url: string
}

export interface ProsodyRecorder {
  status: RecorderStatus
  supported: boolean
  /** Latest recording, not yet kept as an attempt. */
  current: ProsodyRecording | null
  /** First imitation (V1). */
  attempt1: ProsodyRecording | null
  /** Second imitation after correction (V2). */
  attempt2: ProsodyRecording | null
  start: () => Promise<void>
  stop: () => void
  keepAsAttempt1: () => void
  keepAsAttempt2: () => void
  reset: () => void
}

/**
 * Specialized recorder for the prosody loop. Unlike the fluency recorder, it
 * keeps two attempts (V1 and V2) in memory so the learner can compare them.
 * All object URLs are revoked when the component unmounts; nothing is written
 * to localStorage.
 */
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

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const urlsRef = useRef<Set<string>>(new Set())

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
    try {
      setStatus('requesting')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        })
        const url = URL.createObjectURL(blob)
        urlsRef.current.add(url)
        setCurrent({ blob, url })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setStatus('stopped')
      }

      recorder.start()
      recorderRef.current = recorder
      setStatus('recording')
    } catch {
      setStatus('denied')
    }
  }, [supported])

  const keepAsAttempt1 = useCallback(() => {
    setCurrent((latest) => {
      if (!latest) return latest
      setAttempt1((previous) => {
        if (previous) revoke(previous.url)
        return latest
      })
      return null
    })
  }, [revoke])

  const keepAsAttempt2 = useCallback(() => {
    setCurrent((latest) => {
      if (!latest) return latest
      setAttempt2((previous) => {
        if (previous) revoke(previous.url)
        return latest
      })
      return null
    })
  }, [revoke])

  const reset = useCallback(() => {
    setCurrent((latest) => {
      if (latest) revoke(latest.url)
      return null
    })
    setAttempt1((previous) => {
      if (previous) revoke(previous.url)
      return null
    })
    setAttempt2((previous) => {
      if (previous) revoke(previous.url)
      return null
    })
    setStatus('idle')
  }, [revoke])

  // Revoke every remaining URL and release the microphone on unmount.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      for (const url of urlsRef.current) URL.revokeObjectURL(url)
      urlsRef.current.clear()
    }
  }, [])

  return {
    status,
    supported,
    current,
    attempt1,
    attempt2,
    start,
    stop,
    keepAsAttempt1,
    keepAsAttempt2,
    reset,
  }
}
