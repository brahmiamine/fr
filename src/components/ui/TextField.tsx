import type { InputHTMLAttributes, ReactNode } from 'react'

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  id: string
  label: ReactNode
  value: string | number
  onChange: (value: string) => void
  hint?: ReactNode
  /** Rendered after the input (e.g. a listen button). */
  after?: ReactNode
}

export function TextField({
  id,
  label,
  value,
  onChange,
  hint,
  after,
  autoComplete = 'off',
  ...rest
}: TextFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        {...rest}
      />
      {hint ? <span className="field__hint">{hint}</span> : null}
      {after}
    </div>
  )
}
