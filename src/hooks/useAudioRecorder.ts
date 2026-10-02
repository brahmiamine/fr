import { useCallback, useEffect, useRef, useState } from 'react'

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
  start: () => Promise<void>
  stop: () => void
  reset: () => void
}

/**
 * Session-only audio capture using the MediaRecorder API. The recorded blob
 * lives in memory and is discarded when the session ends — nothing large is
 * ever written to localStorage.
 */
export function useAudioRecorder(): AudioRecorder {
  const supported =
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    'mediaDevices' in navigator

  const [status, setStatus] = useState<RecorderStatus>(
    supported ? 'idle' : 'unsupported',
  )
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const urlRef = useRef<string | null>(null)

  const releaseUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setBlobUrl(null)
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
        releaseUrl()
        const url = URL.createObjectURL(blob)
        urlRef.current = url
        setBlobUrl(url)
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
  }, [supported, releaseUrl])

  // Stop the recorder and release the microphone on unmount.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      releaseUrl()
    }
  }, [releaseUrl])

  return { status, supported, blobUrl, start, stop, reset: releaseUrl }
}
