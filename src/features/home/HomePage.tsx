import { Link } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import {
  activeChunkCount,
  calculateCurrentStreak,
  calculateTotalPracticeMinutes,
  calculateWeeklyProgress,
  formatDuration,
  getWeekKey,
  masteredGapCount,
} from '../../services/progress/progress'
import { STAGE_META, STAGE_ORDER } from '../training/types'
import './home.css'

function sessionDurationEstimate(): number {
  return STAGE_ORDER.reduce(
    (total, stage) => total + STAGE_META[stage].minutes,
    0,
  )
}

export default function HomePage() {
  const { state } = useAppState()
  const streak = calculateCurrentStreak(state.sessions)
  const totalMinutes = calculateTotalPracticeMinutes(state.sessions)
  const weekly = calculateWeeklyProgress(state.sessions)
  const mastered = masteredGapCount(state)
  const activeChunks = activeChunkCount(state)

  const hasSession = Boolean(state.inProgressSession)
  const resumeLabel = state.inProgressSession
    ? `Reprendre ma séance — Étape ${state.inProgressSession.stageIndex + 1}/${STAGE_ORDER.length}`
    : null

  const weeklyTestAvailable = !state.weeklyTests.some(
    (test) => test.weekKey === getWeekKey(),
  )

  return (
    <div className="home">
      <header className="home__hero">
        <h1>Prêt pour ta séance ?</h1>
        <p className="muted">
          Aujourd'hui : environ {sessionDurationEstimate()} min
        </p>
        <Link className="button button--block home__cta" to="/training">
          {hasSession ? resumeLabel : 'Commencer ma séance'}
        </Link>
      </header>

      <section className="home__stats" aria-label="Statistiques">
        <div className="stat">
          <span className="stat__value">{streak} j</span>
          <span className="stat__label">Série actuelle</span>
        </div>
        <div className="stat">
          <span className="stat__value">
            {weekly.completed}/{weekly.goal}
          </span>
          <span className="stat__label">Cette semaine</span>
        </div>
        <div className="stat">
          <span className="stat__value">{formatDuration(totalMinutes)}</span>
          <span className="stat__label">Temps total</span>
        </div>
        <div className="stat">
          <span className="stat__value">{mastered}</span>
          <span className="stat__label">Mots débloqués</span>
        </div>
        <div className="stat">
          <span className="stat__value">{activeChunks}</span>
          <span className="stat__label">Chunks actifs</span>
        </div>
      </section>

      {weeklyTestAvailable ? (
        <section className="card home__weekly-test">
          <div>
            <h2>Test de fluidité disponible</h2>
            <p className="muted">Environ 10 minutes, une fois par semaine.</p>
          </div>
          <Link className="button button--ghost" to="/progress">
            Faire le test
          </Link>
        </section>
      ) : null}

      <Link className="button button--ghost button--block" to="/progress">
        Voir ma progression
      </Link>
    </div>
  )
}
