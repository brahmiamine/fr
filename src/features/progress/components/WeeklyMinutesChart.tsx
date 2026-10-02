import { Card } from '../../../components/ui'
import { WEEKDAY_INITIALS } from '../../../services/progress/activity'

export function WeeklyMinutesChart({ minutes }: { minutes: number[] }) {
  const total = minutes.reduce((sum, value) => sum + value, 0)
  const max = Math.max(40, ...minutes)
  return (
    <Card padding="md" aria-labelledby="minutes-chart-title">
      <div className="card-head">
        <h3 id="minutes-chart-title">Minutes cette semaine</h3>
        <span className="muted chart-total">{total} min</span>
      </div>
      <ol className="bar-chart">
        {minutes.map((value, index) => (
          <li key={index} className="bar-chart__col">
            <span className="bar-chart__value">{value || ''}</span>
            <span
              className={`bar-chart__bar${value ? ' is-filled' : ''}`}
              style={{ height: Math.max(6, (value / max) * 120), animationDelay: `${index * 0.06}s` }}
            />
            <span className="bar-chart__label">{WEEKDAY_INITIALS[index]}</span>
          </li>
        ))}
      </ol>
    </Card>
  )
}
