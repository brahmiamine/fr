import type { ReactNode } from 'react'

export interface CalloutProps {
  id?: string
  title?: ReactNode
  tone?: 'plain' | 'soft' | 'dashed'
  className?: string
  children?: ReactNode
  'aria-live'?: 'polite' | 'assertive' | 'off'
}

/** Secondary box inside a card: hints, rescue structures, reminders. */
export function Callout({ title, tone = 'plain', className, children, ...rest }: CalloutProps) {
  return (
    <div className={`callout callout--${tone}${className ? ` ${className}` : ''}`} {...rest}>
      {title ? <h3 className="callout__title">{title}</h3> : null}
      {children}
    </div>
  )
}

/** List with small accent dots instead of bullets. */
export function DotList({
  items,
  className,
}: {
  items: readonly ReactNode[]
  className?: string
}) {
  return (
    <ul className={`dot-list${className ? ` ${className}` : ''}`}>
      {items.map((item, index) => (
        <li key={index} style={{ animationDelay: `${index * 0.05}s` }}>
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Label + value line, e.g. "Prosodie : allonge la dernière syllabe". */
export function InfoLine({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <p className="info-line">
      <span className="muted">{label}</span> <strong>{children}</strong>
    </p>
  )
}
