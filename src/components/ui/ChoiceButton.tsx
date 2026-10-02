import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ChoiceTone = 'success' | 'warning' | 'danger' | 'accent'

export interface ChoiceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone: ChoiceTone
  hint?: ReactNode
  delay?: number
}

/** Self-assessment option: colored dot, bold label and optional hint. */
export function ChoiceButton({
  tone,
  hint,
  delay = 0,
  className,
  children,
  type = 'button',
  style,
  ...rest
}: ChoiceButtonProps) {
  return (
    <button
      type={type}
      className={`choice${hint ? ' choice--stacked' : ''}${className ? ` ${className}` : ''}`}
      style={{ animationDelay: `${delay}s`, ...style }}
      {...rest}
    >
      <span className={`choice__dot choice__dot--${tone}`} aria-hidden="true" />
      <span className="choice__label">{children}</span>
      {hint ? <span className="choice__hint">{hint}</span> : null}
    </button>
  )
}

export function ChoiceGrid({ min = 170, children }: { min?: number; children: ReactNode }) {
  return (
    <div className="choice-grid" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}>
      {children}
    </div>
  )
}
