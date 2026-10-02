import type { ReactNode } from 'react'

/** Small uppercase label above a title. */
export function Eyebrow({
  gradient = false,
  as: Tag = 'p',
  children,
}: {
  gradient?: boolean
  as?: 'p' | 'span' | 'h3'
  children: ReactNode
}) {
  return <Tag className={`eyebrow${gradient ? ' eyebrow--gradient' : ''}`}>{children}</Tag>
}
