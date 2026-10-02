import type { ReactNode } from 'react'

export type PillTone = 'muted' | 'warm' | 'fresh' | 'gradient' | 'contrast' | 'soft'

export interface PillProps {
  tone?: PillTone
  pop?: boolean
  className?: string
  children: ReactNode
}

export function Pill({ tone = 'muted', pop = false, className, children }: PillProps) {
  return (
    <span className={`pill pill--${tone}${pop ? ' pill--pop' : ''}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}
