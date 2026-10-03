import type { ButtonHTMLAttributes } from 'react'

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role'> {
  checked: boolean
  onChange: (checked: boolean) => void
  'aria-label': string
}

/** On/off toggle button (role="switch"). */
export function Switch({ checked, onChange, className, type = 'button', ...rest }: SwitchProps) {
  return (
    <button
      type={type}
      role="switch"
      aria-checked={checked}
      className={`switch-btn${checked ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
      onClick={() => onChange(!checked)}
      {...rest}
    >
      <span className="switch-btn__knob" />
    </button>
  )
}
