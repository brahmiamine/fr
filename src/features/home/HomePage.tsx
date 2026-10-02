import { Link } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import {
  calculateCurrentStreak,
  calculateTotalPracticeMinutes,
  calculateWeeklyProgress,
} from '../../services/progress/progress'
import { EXERCISE_META, EXERCISE_ORDER } from '../training/types'
import './home.css'

function greeting(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export default function HomePage() {
  const { state } = useAppState()
  const streak = calculateCurrentStreak(state.sessions)
  const totalMinutes = calculateTotalPracticeMinutes(state.sessions)
  const weekly = calculateWeeklyProgress(state.sessions)
  const hasSession = Boolean(state.inProgressSession)
  const weeklyPercent = Math.min(
    100,
    Math.round((weekly.completed / weekly.goal) * 100),
  )

  return (
    <div className="home">
      <header className="home__hero">
        <p className="muted">{greeting()}</p>
        <h1>Prêt à parler français ?</h1>
        <p className="muted">
          Une session guidée, quatre exercices, environ 30 minutes.
        </p>
        <Link className="button button--block home__cta" to="/training">
          {hasSession ? 'Reprendre la session' : 'Commencer la session du jour'}
        </Link>
      </header>

      <section className="home__stats" aria-label="Statistiques">
        <div className="stat">
          <span className="stat__value">{streak}</span>
          <span className="stat__label">Série (jours)</span>
        </div>
        <div className="stat">
          <span className="stat__value">{totalMinutes}</span>
          <span className="stat__label">Minutes parlées</span>
        </div>
        <div className="stat">
          <span className="stat__value">{state.sessions.length}</span>
          <span className="stat__label">Sessions</span>
        </div>
      </section>

      <section className="card home__weekly" aria-label="Objectif hebdomadaire">
        <div className="home__weekly-head">
          <h2>Objectif de la semaine</h2>
          <span className="pill">
            {weekly.completed}/{weekly.goal}
          </span>
        </div>
        <div
          className="progress-bar"
          role="progressbar"
          aria-valuenow={weekly.completed}
          aria-valuemin={0}
          aria-valuemax={weekly.goal}
        >
          <div
            className="progress-bar__fill"
            style={{ width: `${weeklyPercent}%` }}
          />
        </div>
        <p className="muted home__weekly-note">
          {weekly.completed >= weekly.goal
            ? 'Objectif atteint, continue sur ta lancée !'
            : `${weekly.goal - weekly.completed} session(s) pour atteindre l'objectif.`}
        </p>
      </section>

      <section className="card" aria-labelledby="today-plan">
        <h2 id="today-plan">Session du jour</h2>
        <ul className="plan">
          {EXERCISE_ORDER.map((exercise) => (
            <li key={exercise} className="plan__item">
              <span className="plan__title">{EXERCISE_META[exercise].title}</span>
              <span className="muted">{EXERCISE_META[exercise].minutes} min</span>
            </li>
          ))}
        </ul>
      </section>

      <Link className="button button--ghost button--block" to="/progress">
        Voir ma progression
      </Link>
    </div>
  )
}
