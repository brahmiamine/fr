import { useMemo } from 'react'
import { useAppState } from '../../app/AppStateProvider'
import { StatGrid } from '../../components/ui'
import type { StatItem } from '../../components/ui'
import { practicedWeekDays } from '../../services/progress/activity'
import {
  activeChunkCount,
  calculateCurrentStreak,
  calculateTotalPracticeMinutes,
  calculateWeeklyProgress,
  formatDuration,
  getWeekKey,
  masteredGapCount,
  trainingLevelForSessions,
} from '../../services/progress/progress'
import { readyProsodyExercises } from '../../services/content/prosodyRepository'
import { STAGE_META, STAGE_ORDER, prepSecondsForLevel } from '../training/types'
import { ChallengeCard } from './components/ChallengeCard'
import { HomeHero } from './components/HomeHero'
import { ProsodyPromo } from './components/ProsodyPromo'
import { StreakWeekCard } from './components/StreakWeekCard'
import { TodaySessionCard } from './components/TodaySessionCard'
import { WeekGoalCard } from './components/WeekGoalCard'
import './home.css'

const SESSION_MINUTES = STAGE_ORDER.reduce(
  (total, stage) => total + STAGE_META[stage].minutes,
  0,
)

/** Monday = 0 … Sunday = 6. */
function todayIndex(): number {
  return (new Date().getDay() + 6) % 7
}

export default function HomePage() {
  const { state } = useAppState()
  const { sessions } = state

  const summary = useMemo(() => {
    const weekKey = getWeekKey()
    return {
      streak: calculateCurrentStreak(sessions),
      weekly: calculateWeeklyProgress(sessions),
      practicedDays: practicedWeekDays(sessions),
      level: trainingLevelForSessions(sessions),
      weeklyTestAvailable: !state.weeklyTests.some((test) => test.weekKey === weekKey),
      conversationAvailable: !state.conversationPractices.some(
        (practice) => practice.weekKey === weekKey,
      ),
    }
  }, [sessions, state.weeklyTests, state.conversationPractices])

  const stats: StatItem[] = [
    {
      icon: 'time',
      tone: 'time',
      value: formatDuration(calculateTotalPracticeMinutes(sessions)),
      label: 'Temps total',
    },
    { icon: 'words', tone: 'words', value: String(masteredGapCount(state)), label: 'Mots débloqués' },
    { icon: 'cube', tone: 'cube', value: String(activeChunkCount(state)), label: 'Chunks actifs' },
  ]

  const ctaLabel = state.inProgressSession
    ? `Reprendre ma séance — Étape ${state.inProgressSession.stageIndex + 1}/${STAGE_ORDER.length}`
    : 'Commencer ma séance'

  return (
    <div className="page home">
      <HomeHero minutes={SESSION_MINUTES} prepSeconds={prepSecondsForLevel(summary.level)} />

      <TodaySessionCard minutes={SESSION_MINUTES} ctaLabel={ctaLabel} />

      <section className="home__row">
        <WeekGoalCard completed={summary.weekly.completed} goal={summary.weekly.goal} />
        <StreakWeekCard
          streak={summary.streak}
          practicedDays={summary.practicedDays}
          todayIndex={todayIndex()}
        />
      </section>

      <StatGrid stats={stats} label="Statistiques" baseDelay={0.24} />

      <section className="home__challenges">
        {summary.weeklyTestAvailable ? (
          <ChallengeCard
            badge="Hebdo · 3 min"
            title="Test de fluidité disponible"
            description="3 minutes, une fois par semaine."
            to="/progress"
            cta="Faire le test"
            delay={0.3}
          />
        ) : null}
        {summary.conversationAvailable ? (
          <ChallengeCard
            badge="Défi · 20–30 min"
            title="Défi de vraie conversation"
            description="20–30 minutes avec une personne, une fois par semaine."
            to="/progress"
            cta="Voir le défi"
            delay={0.36}
          />
        ) : null}
        <ProsodyPromo
          ready={readyProsodyExercises.length > 0}
          completed={state.prosodySessions.length}
        />
      </section>
    </div>
  )
}
