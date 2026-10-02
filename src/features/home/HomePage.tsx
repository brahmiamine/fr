import { Link } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import { HeroIllustration } from '../../components/Decor/Decor'
import { StatIcon } from '../../components/icons/StatIcon'
import type { StatIconName } from '../../components/icons/StatIcon'
import {
  activeChunkCount,
  calculateCurrentStreak,
  calculateTotalPracticeMinutes,
  calculateWeeklyProgress,
  formatDuration,
  getWeekKey,
  masteredGapCount,
  trainingLevelForSessionCount,
} from '../../services/progress/progress'
import { readyProsodyExercises } from '../../services/content/prosodyRepository'
import { STAGE_META, STAGE_ORDER, prepSecondsForLevel } from '../training/types'
import './home.css'

function sessionDurationEstimate(): number {
  return STAGE_ORDER.reduce((total, stage) => total + STAGE_META[stage].minutes, 0)
}

interface Stat {
  icon: StatIconName
  value: string
  label: string
}

export default function HomePage() {
  const { state } = useAppState()
  const streak = calculateCurrentStreak(state.sessions)
  const totalMinutes = calculateTotalPracticeMinutes(state.sessions)
  const weekly = calculateWeeklyProgress(state.sessions)
  const level = trainingLevelForSessionCount(state.sessions.length)

  const hasSession = Boolean(state.inProgressSession)
  const resumeLabel = state.inProgressSession
    ? `Reprendre ma séance — Étape ${state.inProgressSession.stageIndex + 1}/${STAGE_ORDER.length}`
    : null

  const weekKey = getWeekKey()
  const weeklyTestAvailable = !state.weeklyTests.some((test) => test.weekKey === weekKey)
  const conversationAvailable = !state.conversationPractices.some(
    (practice) => practice.weekKey === weekKey,
  )
  const prosodyReady = readyProsodyExercises.length > 0

  const stats: Stat[] = [
    { icon: 'streak', value: `${streak} j`, label: 'Série actuelle' },
    { icon: 'week', value: `${weekly.completed}/${weekly.goal}`, label: 'Cette semaine' },
    { icon: 'time', value: formatDuration(totalMinutes), label: 'Temps total' },
    { icon: 'words', value: String(masteredGapCount(state)), label: 'Mots débloqués' },
    { icon: 'chunks', value: String(activeChunkCount(state)), label: 'Chunks actifs' },
  ]

  return (
    <div className="home">
      <header className="home__hero">
        <div className="home__hero-copy">
          <p className="home__kicker">Ton coach de français parlé</p>
          <h1>Prêt pour ta séance ?</h1>
          <p className="muted">
            Aujourd'hui : environ {sessionDurationEstimate()} min, guidé étape par
            étape. Préparation surprise : {prepSecondsForLevel(level)} s.
          </p>
          <Link className="button button--gradient button--block home__cta" to="/training">
            {hasSession ? resumeLabel : 'Commencer ma séance'}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="home__hero-art">
          <HeroIllustration />
        </div>
      </header>

      <section className="home__stats" aria-label="Statistiques">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="stat"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <span className={`stat__icon stat__icon--${stat.icon}`}>
              <StatIcon name={stat.icon} />
            </span>
            <span className="stat__value">{stat.value}</span>
            <span className="stat__label">{stat.label}</span>
          </div>
        ))}
      </section>

      {weeklyTestAvailable ? (
        <section className="card home__weekly-test">
          <div>
            <h2>Test de fluidité disponible</h2>
            <p className="muted">3 minutes, une fois par semaine.</p>
          </div>
          <Link className="button button--gradient" to="/progress">
            Faire le test
          </Link>
        </section>
      ) : null}

      {conversationAvailable ? (
        <section className="card home__weekly-test">
          <div>
            <h2>Défi de vraie conversation</h2>
            <p className="muted">20–30 minutes avec une personne, une fois par semaine.</p>
          </div>
          <Link className="button button--gradient" to="/progress">
            Voir le défi
          </Link>
        </section>
      ) : null}

      <section className="card home__prosody">
        <div>
          <h2>🎵 Sonner plus naturel</h2>
          <p className="muted">
            Entraîne le rythme et l'intonation : écoute, imite, compare et
            reformule. Objectif : une boucle approfondie de 12–15 min.
          </p>
          {state.prosodySessions.length > 0 ? (
            <p className="muted">
              {state.prosodySessions.length} séance
              {state.prosodySessions.length > 1 ? 's' : ''} terminée
              {state.prosodySessions.length > 1 ? 's' : ''}.
            </p>
          ) : null}
        </div>
        {prosodyReady ? (
          <Link className="button button--gradient" to="/prosody">
            Commencer
          </Link>
        ) : (
          <button type="button" className="button" disabled>
            Audio naturel à ajouter
          </button>
        )}
      </section>

      <Link className="button button--ghost button--block" to="/progress">
        Voir ma progression
      </Link>
    </div>
  )
}
