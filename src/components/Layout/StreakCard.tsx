import { Link } from 'react-router-dom'
import { Icon } from '../ui'

export function StreakFlame({ size = 22 }: { size?: number }) {
  return (
    <span className="flame" aria-hidden="true">
      <Icon name="streak" size={size} filled />
    </span>
  )
}

export function StreakCard({ streak }: { streak: number }) {
  return (
    <div className="streak-card">
      <div className="streak-card__head">
        <StreakFlame />
        <span className="streak-card__value">
          {streak} jour{streak > 1 ? 's' : ''}
        </span>
        <span className="streak-card__unit">de série</span>
      </div>
      <p className="streak-card__text">
        {streak > 0
          ? "Une séance aujourd'hui garde ta série en vie."
          : "Une séance aujourd'hui lance ta série."}
      </p>
      <Link to="/training" className="button button--gradient button--between streak-card__cta">
        <span>Séance du jour</span>
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

export function StreakChip({ streak }: { streak: number }) {
  return (
    <span className="streak-chip" aria-label={`Série : ${streak} jour${streak > 1 ? 's' : ''}`}>
      <StreakFlame size={16} />
      {streak}
    </span>
  )
}
