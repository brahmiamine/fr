import { Card, IconTile } from '../../../components/ui'
import { WEEKDAY_INITIALS } from '../../../services/progress/activity'

export function StreakWeekCard({
  streak,
  practicedDays,
  todayIndex,
}: {
  streak: number
  practicedDays: boolean[]
  todayIndex: number
}) {
  return (
    <Card padding="md" className="streak-week">
      <div className="streak-week__head">
        <IconTile icon="streak" tone="streak" size={38} iconSize={20} className="streak-week__flame" />
        <span className="streak-week__value">{streak} j</span>
        <span className="muted">Série actuelle</span>
      </div>
      <ol className="streak-week__days" aria-label="Jours pratiqués cette semaine">
        {WEEKDAY_INITIALS.map((initial, index) => {
          const done = practicedDays[index]
          const state = done ? 'done' : index === todayIndex ? 'today' : 'empty'
          return (
            <li key={index} className="streak-week__day">
              <span
                className={`streak-week__dot is-${state}`}
                style={{ animationDelay: `${index * 0.06}s` }}
              />
              <span className="streak-week__initial">{initial}</span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
