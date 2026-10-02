import { useEffect, useRef, useState } from 'react'
import { cancelSpeech, speakText } from '../../services/speech'
import { resolveDuration } from './mediaDuration'
import { VoiceWaveform } from './VoiceWaveform'
import './AudioClip.css'

/** Rough spoken duration of a text, to animate progress while speech synthesis plays. */
function estimateSpeechSeconds(text: string, rate = 1): number {
  return Math.max(1.5, text.length / (14 * Math.max(0.5, rate)))
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

export interface AudioClipProps {
  src?: string
  speechText?: string
  speechLocale?: string
  speechRate?: number
  start?: number
  end?: number
  label?: string
  /** Text under the waveform; defaults to the label. */
  caption?: string
  disabled?: boolean
  onPlaybackChange?: (playing: boolean) => void
  /** Reports the playhead position (seconds) as the audio advances or is seeked. */
  onTimeChange?: (seconds: number) => void
  /** Reports the full length (seconds) once the browser knows it. */
  onDuration?: (seconds: number) => void
  onComplete?: () => void
}

export function AudioClip({
  src,
  speechText,
  speechLocale,
  speechRate,
  start,
  end,
  label = 'Écouter',
  caption,
  disabled = false,
  onPlaybackChange,
  onTimeChange,
  onDuration,
  onComplete,
}: AudioClipProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const completedRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [clock, setClock] = useState({ current: 0, total: 0 })

  useEffect(() => () => cancelSpeech(), [])

  // Synthesised speech reports no position: animate against an estimated length.
  useEffect(() => {
    if (!speechText || !playing) return
    const total = estimateSpeechSeconds(speechText, speechRate) * 1000
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      setProgress(Math.min(0.97, (Date.now() - startedAt) / total))
    }, 100)
    return () => window.clearInterval(id)
  }, [speechText, speechRate, playing])

  const setPlayback = (value: boolean) => {
    setPlaying(value)
    onPlaybackChange?.(value)
  }

  const completePlayback = () => {
    if (completedRef.current) return
    completedRef.current = true
    setProgress(1)
    setPlayback(false)
    onComplete?.()
  }

  const togglePlayback = () => {
    if (disabled) return

    if (speechText) {
      if (playing) {
        cancelSpeech()
        setPlayback(false)
        return
      }
      completedRef.current = false
      setProgress(0)
      const started = speakText(speechText, {
        lang: speechLocale,
        rate: speechRate,
        onStart: () => setPlayback(true),
        onEnd: completePlayback,
        onError: () => setPlayback(false),
      })
      if (!started) setPlayback(false)
      return
    }

    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlayback(false)
      return
    }
    if (
      audio.ended ||
      (start !== undefined &&
        (audio.currentTime < start || (end !== undefined && audio.currentTime >= end)))
    ) {
      audio.currentTime = start ?? 0
    }
    completedRef.current = false
    void audio.play().then(() => setPlayback(true)).catch(() => setPlayback(false))
  }

  const audioRange = (audio: HTMLAudioElement): [number, number] => {
    const from = start ?? 0
    const to = end ?? (Number.isFinite(audio.duration) ? audio.duration : from)
    return [from, to]
  }

  const syncClock = (audio: HTMLAudioElement) => {
    onTimeChange?.(audio.currentTime)
    const [from, to] = audioRange(audio)
    if (to > from) {
      setProgress(Math.min(1, Math.max(0, (audio.currentTime - from) / (to - from))))
      setClock({
        current: Math.min(to - from, Math.max(0, audio.currentTime - from)),
        total: to - from,
      })
    }
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (audio) syncClock(audio)
    if (audio && end !== undefined && audio.currentTime >= end) {
      audio.pause()
      completePlayback()
    }
  }

  const handleLoadedMetadata = () => {
    const audio = audioRef.current
    if (!audio) return
    resolveDuration(audio, (seconds) => {
      onDuration?.(seconds)
      syncClock(audio)
    })
  }

  const seekTo = (fraction: number) => {
    const audio = audioRef.current
    if (!audio || speechText) return
    const [from, to] = audioRange(audio)
    if (to <= from) return
    const next = Math.min(1, Math.max(0, fraction))
    audio.currentTime = from + next * (to - from)
    setProgress(next)
    setClock({ current: next * (to - from), total: to - from })
  }

  const canSeek = Boolean(src) && !speechText
  const showClock = canSeek && clock.total > 0

  return (
    <div className="audio-clip">
      <button
        type="button"
        className="audio-player__play"
        onClick={togglePlayback}
        aria-pressed={playing}
        aria-label={label}
        disabled={disabled || (!src && !speechText)}
      >
        <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
      </button>
      <div className="audio-player__body">
        <VoiceWaveform progress={progress} onSeek={canSeek ? seekTo : undefined} />
        <div className="audio-player__meta">
          <p className="audio-player__caption">{caption ?? label}</p>
          {showClock ? (
            <span className="audio-player__time" aria-hidden="true">
              {formatClock(clock.current)} / {formatClock(clock.total)}
            </span>
          ) : null}
        </div>
      </div>
      {src && !speechText ? (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={completePlayback}
          onPause={() => {
            if (!completedRef.current) setPlayback(false)
          }}
        />
      ) : null}
    </div>
  )
}
