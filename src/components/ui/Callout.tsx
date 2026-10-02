import { useState } from 'react'
import type { ReactNode } from 'react'

export interface CalloutProps {
  id?: string
  title?: ReactNode
  tone?: 'plain' | 'soft' | 'dashed'
  className?: string
  children?: ReactNode
  /** Turns the title into a button that expands/collapses the content. */
  collapsible?: boolean
  /** Initial state when `collapsible`; collapsed by default. */
  defaultOpen?: boolean
  'aria-live'?: 'polite' | 'assertive' | 'off'
}

/** Secondary box inside a card: hints, rescue structures, reminders. */
export function Callout({
  title,
  tone = 'plain',
  className,
  children,
  collapsible = false,
  defaultOpen = false,
  ...rest
}: CalloutProps) {
  const [open, setOpen] = useState(defaultOpen)
  const body = collapsible && !open ? null : children

  return (
    <div className={`callout callout--${tone}${className ? ` ${className}` : ''}`} {...rest}>
      {title ? (
        <h3 className="callout__title">
          {collapsible ? (
            <button
              type="button"
              className="callout__toggle"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {title}
              <span className="callout__chevron" aria-hidden="true">
                ▾
              </span>
            </button>
          ) : (
            title
          )}
        </h3>
      ) : null}
      {body}
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
