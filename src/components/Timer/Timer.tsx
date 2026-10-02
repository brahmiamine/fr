import { useEffect } from 'react'
import type {
  CountdownTimer,
  TimerSnapshot,
} from '../../hooks/useCountdownTimer'
import { useCountdownTimer } from '../../hooks/useCountdownTimer'
import { Button, ProgressRing, WaveBars } from '../ui'
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
  /**
   * `ring`: circular countdown. `bubble`: pulsing gradient disc for short
   * "get ready" countdowns. `inline`: time only, next to other content.
   */
  variant?: 'ring' | 'bubble' | 'inline'
  /** Live voice bars under the time while the timer runs. */
  wave?: boolean
}

export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function TimerControls({
  timer,
  durationSeconds,
}: {
  timer: CountdownTimer
  durationSeconds: number
}) {
  const reset = () => timer.reset(durationSeconds)
  return (
    <div className="timer__controls">
      {timer.status === 'idle' ? (
        <Button variant="animated" size="sm" onClick={timer.start}>
          Démarrer
        </Button>
      ) : null}
      {timer.status === 'running' ? (
        <Button variant="ghost" size="sm" onClick={timer.pause}>
          Pause
        </Button>
      ) : null}
      {timer.status === 'paused' ? (
        <>
          <Button variant="animated" size="sm" onClick={timer.resume}>
            Reprendre
          </Button>
          <Button variant="ghost" size="sm" onClick={reset}>
            Réinitialiser
          </Button>
        </>
      ) : null}
      {timer.status === 'finished' ? (
        <Button variant="ghost" size="sm" onClick={reset}>
          Recommencer
        </Button>
      ) : null}
    </div>
  )
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
  variant = 'ring',
  wave = false,
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
  const progress =
    durationSeconds > 0
      ? Math.min(1, Math.max(0, timer.remainingSeconds / durationSeconds))
      : 0
  const isLow =
    !isFinished && durationSeconds > 10 && timer.remainingSeconds <= 10

  const display = secondsOnly
    ? String(timer.remainingSeconds)
    : formatTime(timer.remainingSeconds)

  const time = (
    <span
      className={`timer__time${secondsOnly ? ' timer__time--seconds' : ''}`}
      role="timer"
      aria-live={isFinished ? 'assertive' : 'off'}
    >
      {display}
    </span>
  )

  const classes = [
    'timer',
    `timer--${variant}`,
    compact ? 'timer--compact' : '',
    isFinished ? 'timer--finished' : '',
    isLow ? 'timer--low' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {label ? <p className="timer__label">{label}</p> : null}

      {variant === 'bubble' ? (
        <span
          className="timer__bubble"
          style={{ transform: `scale(${(1 + 0.18 * progress).toFixed(3)})` }}
        >
          {time}
        </span>
      ) : null}

      {variant === 'inline' ? time : null}

      {variant === 'ring' ? (
        <ProgressRing
          value={progress}
          size={compact ? 150 : 230}
          strokeWidth={9}
          tone={isFinished ? 'success' : isLow ? 'danger' : 'gradient'}
          className="timer__ring"
        >
          {time}
          {wave ? (
            <WaveBars count={16} height={26} playing={timer.status === 'running'} />
          ) : null}
        </ProgressRing>
      ) : null}

      {isFinished ? <p className="timer__done">Terminé</p> : null}

      {hideControls ? null : <TimerControls timer={timer} durationSeconds={durationSeconds} />}
    </div>
  )
}
