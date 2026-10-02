import { Card } from '../../../components/ui'
import type { HeatmapDay } from '../../../services/progress/activity'

export function ActivityHeatmap({ days }: { days: HeatmapDay[] }) {
  return (
    <Card padding="md" aria-labelledby="heatmap-title">
      <div className="card-head">
        <h3 id="heatmap-title">12 dernières semaines</h3>
        <span className="muted chart-total">moins → plus</span>
      </div>
      <div className="heatmap">
        {days.map((day, index) => (
          <span
            key={day.date}
            className={`heatmap__cell heatmap__cell--${day.level ?? 'future'}`}
            style={{ animationDelay: `${index * 0.008}s` }}
            title={`${day.date} · ${day.minutes} min`}
          />
        ))}
      </div>
    </Card>
  )
}
