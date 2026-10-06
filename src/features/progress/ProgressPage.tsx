import { useAppState } from '../../app/AppStateProvider'
import { useMemo } from 'react'
import { Eyebrow, StatGrid } from '../../components/ui'
import type { StatItem } from '../../components/ui'
import {
  activityHeatmap,
  minutesByWeekDay,
} from '../../services/progress/activity'
import { ActivityHeatmap } from './components/ActivityHeatmap'
import { HistoryCard } from './components/HistoryList'
import { WeeklyMinutesChart } from './components/WeeklyMinutesChart'
import {
  activeChunkCount,
  calculateCurrentStreak,
  calculateLongestStreak,
  calculateProsodyMinutes,
  calculateTotalPracticeMinutes,
  findComparisonTest,
  formatDuration,
  getWeekKey,
  masteredGapCount,
} from '../../services/progress/progress'
import ConversationPrep from './ConversationPrep'
import WeeklyConversation from './WeeklyConversation'
import WeeklyTest from './WeeklyTest'
import type { WeeklyTestRecord } from '../../types/progress'
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

function wpm(wordsSpoken?: number): number {
  return Math.round((wordsSpoken ?? 0) / 3)
}

/** Known minus unknown speaking rate: the transfer indicator. */
function transferGap(test: WeeklyTestRecord): number | null {
  const known = test.known?.wordsPerMinute
  const unknown = test.unknown?.wordsPerMinute
  return known === undefined || unknown === undefined ? null : known - unknown
}

export default function ProgressPage() {
  const { state } = useAppState()
  const currentStreak = calculateCurrentStreak(state.sessions)
  const longestStreak = calculateLongestStreak(state.sessions)
  const totalMinutes = calculateTotalPracticeMinutes(state.sessions)
  const prosodyMinutes = calculateProsodyMinutes(state.prosodySessions)
  const recentProsodySessions = [...state.prosodySessions].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  )

  const recentSessions = [...state.sessions].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  )

  const thisWeek = getWeekKey()
  const currentTest = state.weeklyTests.find((test) => test.weekKey === thisWeek)
  const comparisonTest = findComparisonTest(state.weeklyTests, thisWeek)
  const testHistory = [...state.weeklyTests]
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey))
    .slice(0, 8)

  const hasSessions = state.sessions.length > 0

  const charts = useMemo(() => {
    const records = [...state.sessions, ...state.prosodySessions]
    return { week: minutesByWeekDay(records), heatmap: activityHeatmap(records) }
  }, [state.sessions, state.prosodySessions])

  const stats: StatItem[] = [
    { icon: 'streak', tone: 'streak', value: String(currentStreak), label: 'Série actuelle' },
    { icon: 'streak', tone: 'best', value: String(longestStreak), label: 'Meilleure série' },
    { icon: 'time', tone: 'time', value: formatDuration(totalMinutes), label: 'Temps total' },
    { icon: 'week', tone: 'week', value: String(state.sessions.length), label: 'Sessions' },
    { icon: 'words', tone: 'words', value: String(masteredGapCount(state)), label: 'Mots débloqués' },
    { icon: 'cube', tone: 'cube', value: String(activeChunkCount(state)), label: 'Chunks actifs' },
  ]

  return (
    <div className="page progress">
      <header className="page-title">
        <Eyebrow gradient>Tout reste sur ton appareil</Eyebrow>
        <h1>Progression</h1>
      </header>

      <StatGrid stats={stats} label="Résumé" minWidth={140} />

      <WeeklyTest />
      <ConversationPrep />
      <WeeklyConversation />

      <section className="progress__charts">
        <WeeklyMinutesChart minutes={charts.week} />
        <ActivityHeatmap days={charts.heatmap} />
      </section>

      {currentTest && comparisonTest ? (
        <section className="card card--md" aria-labelledby="weekly-compare">
          <h2 id="weekly-compare">
            Cette semaine vs semaine du {formatDate(comparisonTest.weekKey)}
          </h2>
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
                <th scope="row">Écart connu / inconnu (mots/min)</th>
                <td>{transferGap(comparisonTest) ?? '—'}</td>
                <td>{transferGap(currentTest) ?? '—'}</td>
              </tr>
              <tr>
                <th scope="row">Durée moyenne des pauses (s)</th>
                <td>{comparisonTest.unknown?.meanPauseSeconds ?? '—'}</td>
                <td>{currentTest.unknown?.meanPauseSeconds ?? '—'}</td>
              </tr>
              <tr>
                <th scope="row">« euh » nus / marqueurs</th>
                <td>
                  {comparisonTest.majorFillers} / {comparisonTest.markers ?? '—'}
                </td>
                <td>
                  {currentTest.majorFillers} / {currentTest.markers ?? '—'}
                </td>
              </tr>
              <tr>
                <th scope="row">Score ressenti</th>
                <td>{comparisonTest.score}</td>
                <td>{currentTest.score}</td>
              </tr>
            </tbody>
          </table>
          <p className="muted">
            Si l'écart entre tâche connue et inconnue se réduit, l'automatisation est
            générale ; s'il reste stable, tu automatises des discours, pas la langue.
            Les silences baissent plus lentement que le débit : juge sur 4 à 6 semaines.
          </p>
        </section>
      ) : null}

      {testHistory.length > 1 ? (
        <section className="card card--md" aria-labelledby="weekly-history">
          <h2 id="weekly-history">Évolution des tests hebdomadaires</h2>
          <table className="progress__table">
            <thead>
              <tr>
                <th scope="col">Semaine</th>
                <th scope="col">Démarrage (s)</th>
                <th scope="col">Pauses milieu</th>
                <th scope="col">Segment (s)</th>
                <th scope="col">Mots/min</th>
              </tr>
            </thead>
            <tbody>
              {testHistory.map((test) => (
                <tr key={test.weekKey}>
                  <th scope="row">{formatDate(test.weekKey)}</th>
                  <td>{test.startDelaySeconds}</td>
                  <td>{test.midSentencePauses ?? test.longPauses}</td>
                  <td>{test.longestFluentSegmentSeconds}</td>
                  <td>{wpm(test.wordsSpoken)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <HistoryCard
        id="prosody-history-title"
        title="Sonner plus naturel"
        summary={
          state.prosodySessions.length > 0 ? (
            <p className="muted">
              {state.prosodySessions.length} séance
              {state.prosodySessions.length > 1 ? 's' : ''} · {formatDuration(prosodyMinutes)}
            </p>
          ) : null
        }
        entries={recentProsodySessions.slice(0, 8).map((session) => ({
          key: session.id,
          title: formatDate(session.date),
          notes: [
            `Extrait : ${session.exerciseId}`,
            ...(session.melodyDistance?.v2 !== undefined
              ? [`Écart de mélodie (V2) : ${session.melodyDistance.v2}`]
              : []),
          ],
          tags: [
            `${session.durationMinutes} min`,
            `Retelling ${session.retellingSeconds} s`,
            ...(session.cold ? ['À froid'] : []),
            ...(session.focus ? [`Focus : ${session.focus}`] : []),
          ],
        }))}
        empty="Aucune séance de prosodie terminée pour le moment."
      />

      <HistoryCard
        id="history-title"
        title="Historique des sessions"
        entries={
          hasSessions
            ? recentSessions.map((session) => ({
                key: session.id,
                title: formatDate(session.date),
                notes: [
                  ...(session.blockedWord ? [`Mot bloquant : ${session.blockedWord}`] : []),
                  ...(session.expressionToReuse
                    ? [`Chunk personnel : ${session.expressionToReuse}`]
                    : []),
                ],
                tags: [
                  `${session.durationMinutes} min`,
                  `${session.blockCount} blocages`,
                  `Fluidité ${session.fluencyScore}/5`,
                ],
              }))
            : []
        }
        empty="Aucune session terminée pour le moment. Lance ta première session depuis l'accueil."
      />

      {state.wordGaps.length > 0 ? (
        <section className="card card--md" aria-labelledby="gaps-title">
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
        <section className="card card--md" aria-labelledby="notes-title">
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
