import { useId } from 'react'
import type { ReactNode } from 'react'

const R = 62
export const RING_CIRCUMFERENCE = 2 * Math.PI * R

export interface ProgressRingProps {
  /** Filled share, between 0 and 1. */
  value: number
  size?: number
  strokeWidth?: number
  tone?: 'gradient' | 'success' | 'danger'
  /** Animates the fill from empty on mount. */
  animateIn?: boolean
  className?: string
  children?: ReactNode
}

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 10,
  tone = 'gradient',
  animateIn = false,
  className,
  children,
}: ProgressRingProps) {
  const gradientId = useId()
  const clamped = Math.min(1, Math.max(0, value))
  const stroke =
    tone === 'success' ? 'var(--success)' : tone === 'danger' ? 'var(--danger)' : `url(#${gradientId})`

  return (
    <div className={`ring${className ? ` ${className}` : ''}`} style={{ width: size, height: size }}>
      <svg className="ring__svg" viewBox="0 0 140 140" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5b5bd6" />
            <stop offset="0.55" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#ff6b9d" />
          </linearGradient>
        </defs>
        <circle className="ring__track" cx="70" cy="70" r={R} strokeWidth={strokeWidth} />
        <circle
          className={`ring__fill${animateIn ? ' ring__fill--animate' : ''}`}
          cx="70"
          cy="70"
          r={R}
          strokeWidth={strokeWidth}
          stroke={stroke}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - clamped)}
        />
      </svg>
      {children !== undefined ? <div className="ring__center">{children}</div> : null}
    </div>
  )
}
