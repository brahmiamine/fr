import { useAppState } from '../../app/AppStateProvider'
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateTotalPracticeMinutes,
  getWeekKey,
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
        <div className="stat">
          <span className="stat__value">{currentStreak}</span>
          <span className="stat__label">Série actuelle</span>
        </div>
        <div className="stat">
          <span className="stat__value">{longestStreak}</span>
          <span className="stat__label">Meilleure série</span>
        </div>
        <div className="stat">
          <span className="stat__value">{totalMinutes}</span>
          <span className="stat__label">Minutes</span>
        </div>
        <div className="stat">
          <span className="stat__value">{state.sessions.length}</span>
          <span className="stat__label">Sessions</span>
        </div>
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
                  ['Pauses longues', 'longPauses'],
                  ['Faux départs', 'majorFillers'],
                  ['Paraphrases', 'successfulParaphrases'],
                  ['Phrases abandonnées', 'abandonedSentences'],
                  ['Démarrage (s)', 'startDelaySeconds'],
                  ['Segment fluide (s)', 'longestFluentSegmentSeconds'],
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
                  {session.successParaphrase ? (
                    <p className="muted history__note">
                      Paraphrase : {session.successParaphrase}
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
    </div>
  )
}
