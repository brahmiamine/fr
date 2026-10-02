import { useEffect, useId } from 'react'
import type {
  CountdownTimer,
  TimerSnapshot,
} from '../../hooks/useCountdownTimer'
import { useCountdownTimer } from '../../hooks/useCountdownTimer'
import './Timer.css'

export interface TimerProps {
  durationSeconds: number
  snapshot?: TimerSnapshot | null
  onComplete?: () => void
  autoStart?: boolean
  compact?: boolean
  label?: string
  hideControls?: boolean
  resetKey?: string | number
  timer?: CountdownTimer
  secondsOnly?: boolean
}

export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const R = 62
const CIRCUMFERENCE = 2 * Math.PI * R

export function Timer({
  durationSeconds,
  snapshot,
  onComplete,
  autoStart = false,
  compact = false,
  label,
  hideControls = false,
  resetKey,
  timer: externalTimer,
  secondsOnly = false,
}: TimerProps) {
  const internalTimer = useCountdownTimer({
    durationSeconds,
    snapshot,
    onComplete,
    autoStart,
  })
  const timer = externalTimer ?? internalTimer
  const gradientId = useId()

  const { reset } = timer
  useEffect(() => {
    if (resetKey === undefined) return
    reset(durationSeconds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  const isFinished = timer.status === 'finished'
  const progress =
    durationSeconds > 0
      ? Math.min(1, Math.max(0, timer.remainingSeconds / durationSeconds))
      : 0
  const dashOffset = CIRCUMFERENCE * (1 - progress)
  const isLow =
    !isFinished && durationSeconds > 10 && timer.remainingSeconds <= 10

  const display = secondsOnly
    ? String(timer.remainingSeconds)
    : formatTime(timer.remainingSeconds)

  return (
    <div
      className={`timer ${compact ? 'timer--compact' : ''} ${
        isFinished ? 'timer--finished' : ''
      } ${isLow ? 'timer--low' : ''}`}
    >
      {label ? <p className="timer__label">{label}</p> : null}

      <div className="timer__ring" role="timer" aria-live={isFinished ? 'assertive' : 'off'}>
        <svg className="timer__svg" viewBox="0 0 140 140">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5b5bd6" />
              <stop offset="0.55" stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#ff6b9d" />
            </linearGradient>
          </defs>
          <circle className="timer__track" cx="70" cy="70" r={R} />
          <circle
            className="timer__progress"
            cx="70"
            cy="70"
            r={R}
            stroke={`url(#${gradientId})`}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className={`timer__time ${secondsOnly ? 'timer__time--seconds' : ''}`}>
          {display}
        </span>
      </div>

      {isFinished ? <p className="timer__done">Terminé</p> : null}

      {hideControls ? null : (
        <div className="timer__controls">
          {timer.status === 'idle' ? (
            <button type="button" className="button button--gradient" onClick={timer.start}>
              Démarrer
            </button>
          ) : null}
          {timer.status === 'running' ? (
            <button type="button" className="button button--ghost" onClick={timer.pause}>
              Pause
            </button>
          ) : null}
          {timer.status === 'paused' ? (
            <>
              <button type="button" className="button button--gradient" onClick={timer.resume}>
                Reprendre
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={() => timer.reset(durationSeconds)}
              >
                Réinitialiser
              </button>
            </>
          ) : null}
          {isFinished ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={() => timer.reset(durationSeconds)}
            >
              Recommencer
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
