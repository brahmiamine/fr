import type { ButtonHTMLAttributes } from 'react'

export interface ToggleChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean
}

/** Pill-shaped toggle that turns green when active. */
export function ToggleChip({ active, className, type = 'button', children, ...rest }: ToggleChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={`chip${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {children}
    </button>
  )
}
