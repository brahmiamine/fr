import type { HTMLAttributes, ReactNode } from 'react'

export interface AiFrameProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section'
  /** `sm` is for compact boxes nested in a card. */
  size?: 'md' | 'sm'
  children: ReactNode
}

/** Card with the animated gradient border that marks everything driven by the AI. */
export function AiFrame({ as: Tag = 'div', size = 'md', className, children, ...rest }: AiFrameProps) {
  return (
    <Tag className={`ai-frame ai-frame--${size}${className ? ` ${className}` : ''}`} {...rest}>
      <div className="ai-frame__inner">{children}</div>
    </Tag>
  )
}
