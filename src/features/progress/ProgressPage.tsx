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
import WeeklyConversation from './WeeklyConversation'
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

function shiftWeekKey(weekKey: string, days: number): string {
  const [year, month, day] = weekKey.split('-').map(Number)
  const date = new Date(year, (month ?? 1) - 1, day ?? 1)
  date.setDate(date.getDate() + days)
  return toLocalDateString(date)
}

function wpm(wordsSpoken?: number): number {
  return Math.round((wordsSpoken ?? 0) / 3)
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
  const fourWeeksAgo = shiftWeekKey(thisWeek, -28)
  const currentTest = state.weeklyTests.find((test) => test.weekKey === thisWeek)
  const comparisonTest = state.weeklyTests.find(
    (test) => test.weekKey === fourWeeksAgo,
  )

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

      <WeeklyTest />
      <WeeklyConversation />

      {currentTest && comparisonTest ? (
        <section className="card" aria-labelledby="weekly-compare">
          <h2 id="weekly-compare">Cette semaine vs il y a 4 semaines</h2>
          <table className="progress__table">
            <thead>
              <tr>
                <th scope="col">Mesure</th>
                <th scope="col">Il y a 4 sem.</th>
                <th scope="col">Actuel</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Démarrage (s)</th>
                <td>{comparisonTest.startDelaySeconds}</td>
                <td>{currentTest.startDelaySeconds}</td>
              </tr>
              <tr>
                <th scope="row">Pauses milieu de phrase</th>
                <td>{comparisonTest.midSentencePauses ?? comparisonTest.longPauses}</td>
                <td>{currentTest.midSentencePauses ?? currentTest.longPauses}</td>
              </tr>
              <tr>
                <th scope="row">Phrases abandonnées</th>
                <td>{comparisonTest.abandonedSentences}</td>
                <td>{currentTest.abandonedSentences}</td>
              </tr>
              <tr>
                <th scope="row">Mots contournés</th>
                <td>{comparisonTest.successfulParaphrases}</td>
                <td>{currentTest.successfulParaphrases}</td>
              </tr>
              <tr>
                <th scope="row">Segment fluide (s)</th>
                <td>{comparisonTest.longestFluentSegmentSeconds}</td>
                <td>{currentTest.longestFluentSegmentSeconds}</td>
              </tr>
              <tr>
                <th scope="row">Débit approx. (mots/min)</th>
                <td>{wpm(comparisonTest.wordsSpoken)}</td>
                <td>{wpm(currentTest.wordsSpoken)}</td>
              </tr>
              <tr>
                <th scope="row">Score ressenti</th>
                <td>{comparisonTest.score}</td>
                <td>{currentTest.score}</td>
              </tr>
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
                      Chunk personnel : {session.expressionToReuse}
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
                    <p className="muted history__note">Idée : {gap.context}</p>
                  ) : (
                    <p className="muted history__note">
                      Ancien mot sans contexte enregistré
                    </p>
                  )}
                </div>
                <div className="history__meta">
                  <span className="pill">
                    {gap.status === 'mastered'
                      ? 'Maîtrisé'
                      : `Prochain : ${gap.nextReview}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {state.fluencyNotes.length > 0 ? (
        <section className="card" aria-labelledby="notes-title">
          <h2 id="notes-title">Corrections à réutiliser</h2>
          <ul className="history">
            {state.fluencyNotes.map((note) => (
              <li key={note.id} className="history__item">
                <div>
                  <p className="history__date">{note.text}</p>
                </div>
                <div className="history__meta">
                  <span className="pill">Prochain : {note.nextReview}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
