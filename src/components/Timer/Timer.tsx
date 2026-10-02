import { useEffect } from 'react'
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
  /** Hide the built-in controls when the parent drives the timer itself. */
  hideControls?: boolean
  /** Changing this value restarts the countdown from `durationSeconds`. */
  resetKey?: string | number
  /** Supply a timer instance managed by the parent instead of creating one. */
  timer?: CountdownTimer
  /** Display a bare seconds value instead of MM:SS (for 3→2→1 reveals). */
  secondsOnly?: boolean
}

export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

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

  const { reset } = timer
  useEffect(() => {
    if (resetKey === undefined) return
    reset(durationSeconds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  const isFinished = timer.status === 'finished'

  return (
    <div
      className={`timer ${compact ? 'timer--compact' : ''} ${
        isFinished ? 'timer--finished' : ''
      }`}
    >
      {label ? <p className="timer__label">{label}</p> : null}
      <p
        className="timer__display"
        role="timer"
        aria-live={isFinished ? 'assertive' : 'off'}
      >
        {secondsOnly
          ? String(timer.remainingSeconds)
          : formatTime(timer.remainingSeconds)}
      </p>
      {isFinished ? <p className="timer__done">Terminé</p> : null}
      {hideControls ? null : (
        <div className="timer__controls">
          {timer.status === 'idle' ? (
            <button type="button" className="button" onClick={timer.start}>
              Démarrer
            </button>
          ) : null}
          {timer.status === 'running' ? (
            <button
              type="button"
              className="button button--ghost"
              onClick={timer.pause}
            >
              Pause
            </button>
          ) : null}
          {timer.status === 'paused' ? (
            <>
              <button type="button" className="button" onClick={timer.resume}>
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
