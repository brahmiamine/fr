import { Icon } from './Icon'
import type { IconName } from './Icon'

export type TileTone =
  | 'chunks'
  | 'fluency'
  | 'reprise'
  | 'questions'
  | 'gaps'
  | 'feedback'
  | 'streak'
  | 'best'
  | 'time'
  | 'week'
  | 'words'
  | 'cube'
  | 'success'
  | 'gradient'

export interface IconTileProps {
  icon: IconName
  tone?: TileTone
  size?: number
  iconSize?: number
  /** Halo pulse, used for the current step. */
  pulse?: boolean
  className?: string
}

export function IconTile({
  icon,
  tone = 'gradient',
  size = 36,
  iconSize = Math.round(size / 2),
  pulse = false,
  className,
}: IconTileProps) {
  return (
    <span
      className={`icon-tile icon-tile--${tone}${pulse ? ' icon-tile--pulse' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Icon name={icon} size={iconSize} strokeWidth={2} />
    </span>
  )
}
