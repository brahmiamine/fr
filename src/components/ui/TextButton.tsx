import type { ButtonHTMLAttributes } from 'react'

/** Discreet underlined action, e.g. secondary links inside a card. */
export function TextButton({
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={`text-button${className ? ` ${className}` : ''}`} {...rest} />
}
