import type { CSSProperties } from 'react'
import type { IconName } from './Icon'
import { IconTile } from './IconTile'
import type { TileTone } from './IconTile'

export interface StatItem {
  icon: IconName
  tone: TileTone
  value: string
  label: string
}

export function StatCard({ icon, tone, value, label, delay = 0 }: StatItem & { delay?: number }) {
  return (
    <div className="stat" style={{ animationDelay: `${delay}s` }}>
      <IconTile icon={icon} tone={tone} size={34} iconSize={18} />
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  )
}

export function StatGrid({
  stats,
  label,
  minWidth = 150,
  baseDelay = 0,
}: {
  stats: StatItem[]
  label: string
  minWidth?: number
  baseDelay?: number
}) {
  return (
    <section
      className="stat-grid"
      aria-label={label}
      style={{ '--stat-min': `${minWidth}px` } as CSSProperties}
    >
      {stats.map((stat, index) => (
        <StatCard key={stat.label} {...stat} delay={baseDelay + index * 0.05} />
      ))}
    </section>
  )
}

/** Compact value + label tile used in summaries. */
export function MiniStat({
  value,
  label,
  tone = 'plain',
  delay,
}: {
  value: string
  label: string
  tone?: 'plain' | 'soft'
  delay?: number
}) {
  return (
    <div
      className={`mini-stat mini-stat--${tone}`}
      style={delay !== undefined ? { animationDelay: `${delay}s` } : undefined}
    >
      <span className="mini-stat__value">{value}</span>
      <span className="mini-stat__label">{label}</span>
    </div>
  )
}
