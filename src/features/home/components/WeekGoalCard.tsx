import { Card, ProgressRing } from '../../../components/ui'

export function WeekGoalCard({ completed, goal }: { completed: number; goal: number }) {
  const remaining = Math.max(0, goal - completed)
  return (
    <Card padding="md" className="week-goal">
      <ProgressRing value={goal > 0 ? completed / goal : 0} size={96} strokeWidth={14} animateIn>
        <span className="week-goal__count">
          {completed}/{goal}
        </span>
      </ProgressRing>
      <div className="week-goal__text">
        <span className="week-goal__title">Cette semaine</span>
        <span className="muted">
          {remaining === 0
            ? 'Objectif de la semaine atteint. Bravo !'
            : `Encore ${remaining} séance${remaining > 1 ? 's' : ''} pour atteindre ton objectif.`}
        </span>
      </div>
    </Card>
  )
}
