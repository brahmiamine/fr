import { memo } from 'react'

export interface WaveBarsProps {
  count?: number
  /** Max bar height in px. */
  height?: number
  playing?: boolean
  tone?: 'gradient' | 'accent' | 'white'
  /** Bars stretch to fill the width instead of a fixed 4px. */
  fluid?: boolean
  speed?: number
  className?: string
}

/** Deterministic pseudo-random heights so renders stay stable. */
function barHeight(index: number, max: number): number {
  const ratio = 0.35 + 0.65 * Math.abs(Math.sin(index * 1.7 + 0.6))
  return Math.max(4, Math.round(max * ratio))
}

export const WaveBars = memo(function WaveBars({
  count = 16,
  height = 26,
  playing = true,
  tone = 'gradient',
  fluid = false,
  speed = 1,
  className,
}: WaveBarsProps) {
  return (
    <span
      className={`wave wave--${tone}${fluid ? ' wave--fluid' : ''}${playing ? '' : ' wave--paused'}${className ? ` ${className}` : ''}`}
      style={{ height }}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className="wave__bar"
          style={{
            height: barHeight(index, height),
            animationDuration: `${speed}s`,
            animationDelay: `${-((index * 0.09) % speed).toFixed(2)}s`,
          }}
        />
      ))}
    </span>
  )
})
