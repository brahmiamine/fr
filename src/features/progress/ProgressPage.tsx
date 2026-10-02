import { useAppState } from '../../app/AppStateProvider'
import { StatIcon } from '../../components/icons/StatIcon'
import type { StatIconName } from '../../components/icons/StatIcon'
import {
  activeChunkCount,
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateTotalPracticeMinutes,
  formatDuration,
  getWeekKey,
  masteredGapCount,
  toLocalDateString,
} from '../../services/progress/progress'
import WeeklyTest from './WeeklyTest'
import './progress.css'

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function getPreviousWeekKey(weekKey: string): string {
  const [year, month, day] = weekKey.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  date.setDate(date.getDate() - 7)
  return toLocalDateString(date)
}

export default function ProgressPage() {
  const { state } = useAppState()
  const currentStreak = calculateCurrentStreak(state.sessions)
  const longestStreak = calculateLongestStreak(state.sessions)
  const totalMinutes = calculateTotalPracticeMinutes(state.sessions)

  const recentSessions = [...state.sessions].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  )

  const thisWeek = getWeekKey()
  const lastWeek = getPreviousWeekKey(thisWeek)
  const currentTest = state.weeklyTests.find((test) => test.weekKey === thisWeek)
  const previousTest = state.weeklyTests.find((test) => test.weekKey === lastWeek)

  const hasSessions = state.sessions.length > 0

  return (
    <div className="progress">
      <h1>Progression</h1>

      <section className="progress__stats" aria-label="Résumé">
        {(
          [
            { icon: 'streak', value: String(currentStreak), label: 'Série actuelle' },
            { icon: 'streak', value: String(longestStreak), label: 'Meilleure série' },
            { icon: 'time', value: formatDuration(totalMinutes), label: 'Temps total' },
            { icon: 'week', value: String(state.sessions.length), label: 'Sessions' },
            { icon: 'words', value: String(masteredGapCount(state)), label: 'Mots débloqués' },
            { icon: 'chunks', value: String(activeChunkCount(state)), label: 'Chunks actifs' },
          ] as { icon: StatIconName; value: string; label: string }[]
        ).map((stat, index) => (
          <div key={stat.label} className="stat" style={{ animationDelay: `${index * 0.05}s` }}>
            <span className={`stat__icon stat__icon--${stat.icon}`}>
              <StatIcon name={stat.icon} />
            </span>
            <span className="stat__value">{stat.value}</span>
            <span className="stat__label">{stat.label}</span>
          </div>
        ))}
      </section>

      <WeeklyTest />

      {currentTest && previousTest ? (
        <section className="card" aria-labelledby="weekly-compare">
          <h2 id="weekly-compare">Cette semaine vs la précédente</h2>
          <table className="progress__table">
            <thead>
              <tr>
                <th scope="col">Mesure</th>
                <th scope="col">Préc.</th>
                <th scope="col">Actuel</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['Démarrage (s)', 'startDelaySeconds'],
                  ['Pauses longues', 'longPauses'],
                  ['Phrases abandonnées', 'abandonedSentences'],
                  ['Mots contournés', 'successfulParaphrases'],
                  ['Segment fluide (s)', 'longestFluentSegmentSeconds'],
                  ['Score ressenti', 'score'],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{previousTest[key]}</td>
                  <td>{currentTest[key]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="card" aria-labelledby="history-title">
        <h2 id="history-title">Historique des sessions</h2>
        {hasSessions ? (
          <ul className="history">
            {recentSessions.map((session) => (
              <li key={session.id} className="history__item">
                <div>
                  <p className="history__date">{formatDate(session.date)}</p>
                  {session.blockedWord ? (
                    <p className="muted history__note">
                      Mot bloquant : {session.blockedWord}
                    </p>
                  ) : null}
                  {session.expressionToReuse ? (
                    <p className="muted history__note">
                      À réutiliser : {session.expressionToReuse}
                    </p>
                  ) : null}
                </div>
                <div className="history__meta">
                  <span className="pill">{session.durationMinutes} min</span>
                  <span className="pill">{session.blockCount} blocages</span>
                  <span className="pill">Fluidité {session.fluencyScore}/5</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Aucune session terminée pour le moment. Lance ta première session
            depuis l'accueil.
          </p>
        )}
      </section>

      {state.wordGaps.length > 0 ? (
        <section className="card" aria-labelledby="gaps-title">
          <h2 id="gaps-title">Mes trous de mots</h2>
          <ul className="history">
            {state.wordGaps.map((gap) => (
              <li key={gap.id} className="history__item">
                <div>
                  <p className="history__date">{gap.target}</p>
                  {gap.context ? (
                    <p className="muted history__note">{gap.context}</p>
                  ) : null}
                </div>
                <div className="history__meta">
                  <span className="pill">
                    {gap.status === 'mastered' ? 'Maîtrisé' : `Prochain : ${gap.nextReview}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
