import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'

export type ButtonVariant =
  | 'primary'
  | 'animated'
  | 'subtle'
  | 'ghost'
  | 'dashed'
  | 'accent-outline'
  | 'success'

interface ButtonStyleProps {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  /** Trailing glyph (→, ▶, ✓…) pushed to the right edge. */
  trailing?: ReactNode
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: '',
  animated: 'button--gradient',
  subtle: 'button--subtle',
  ghost: 'button--ghost',
  dashed: 'button--dashed',
  'accent-outline': 'button--outline-accent',
  success: 'button--success',
}

export function buttonClassName({
  variant = 'primary',
  size = 'md',
  block = false,
  trailing,
  className,
}: ButtonStyleProps & { className?: string }): string {
  return [
    'button',
    VARIANT_CLASS[variant],
    size === 'lg' ? 'button--lg' : size === 'sm' ? 'button--sm' : '',
    block ? 'button--block' : '',
    trailing !== undefined ? 'button--between' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
}

function Content({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  if (trailing === undefined) return <>{children}</>
  return (
    <>
      <span>{children}</span>
      <span className="button__arrow" aria-hidden="true">
        {trailing}
      </span>
    </>
  )
}

export type ButtonProps = ButtonStyleProps & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant,
  size,
  block,
  trailing,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, block, trailing, className })}
      {...rest}
    >
      <Content trailing={trailing}>{children}</Content>
    </button>
  )
}

export type ButtonLinkProps = ButtonStyleProps & LinkProps

export function ButtonLink({
  variant,
  size,
  block,
  trailing,
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link className={buttonClassName({ variant, size, block, trailing, className })} {...rest}>
      <Content trailing={trailing}>{children}</Content>
    </Link>
  )
}
