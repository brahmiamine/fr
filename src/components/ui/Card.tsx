import type { HTMLAttributes, ReactNode } from 'react'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article'
  /** `solid` drops the glass effect (needed under 3D transforms). */
  variant?: 'glass' | 'solid'
  padding?: 'md' | 'lg'
  /** Entrance animation. */
  enter?: 'fade' | 'slide' | 'pop' | 'none'
  center?: boolean
  children: ReactNode
}

export function Card({
  as: Tag = 'section',
  variant = 'glass',
  padding = 'lg',
  enter = 'fade',
  center = false,
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [
    'card',
    variant === 'solid' ? 'card--solid' : '',
    padding === 'md' ? 'card--md' : '',
    enter !== 'none' ? `card--${enter}` : '',
    center ? 'card--center' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}
