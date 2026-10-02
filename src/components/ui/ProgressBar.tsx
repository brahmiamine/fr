import type { HTMLAttributes } from 'react'

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  /** Filled share, between 0 and 1. */
  value: number
  tone?: 'gradient' | 'success'
  size?: 'sm' | 'md'
}

export function ProgressBar({
  value,
  tone = 'gradient',
  size = 'md',
  className,
  ...rest
}: ProgressBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className={`bar bar--${size}${className ? ` ${className}` : ''}`} {...rest}>
      <span className={`bar__fill bar__fill--${tone}`} style={{ width: `${percent}%` }} />
    </div>
  )
}

export interface SegmentedProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** One value per segment, each between 0 and 1. */
  segments: number[]
  labels?: string[]
  activeIndex?: number
}

export function SegmentedProgress({
  segments,
  labels,
  activeIndex,
  className,
  ...rest
}: SegmentedProgressProps) {
  return (
    <div
      className={`segments${className ? ` ${className}` : ''}`}
      style={{ gridTemplateColumns: `repeat(${segments.length}, 1fr)` }}
      {...rest}
    >
      {segments.map((value, index) => (
        <div key={index} className="segments__item">
          <ProgressBar value={value} size="sm" />
          {labels ? (
            <span className={`segments__label${index === activeIndex ? ' is-active' : ''}`}>
              {labels[index]}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}
