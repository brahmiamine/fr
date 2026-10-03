import { Icon } from './Icon'

/** Gradient tile with the animated sparkle used as the AI mark. */
export function AiMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="ai-mark"
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      aria-hidden="true"
    >
      <Icon name="sparkle" size={Math.round(size * 0.52)} />
    </span>
  )
}

export function AiTag({ children = 'IA' }: { children?: string }) {
  return <span className="ai-tag">{children}</span>
}
