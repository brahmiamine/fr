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
  conversationsThisWeek,
  formatDuration,
  getWeekKey,
  masteredGapCount,
  setInProgressSession,
  trainingLevelForSessions,
} from '../../services/progress/progress'
import { CONVERSATIONS_PER_WEEK } from '../../types/progress'
import { readyProsodyExercises } from '../../services/content/prosodyRepository'
import { STAGE_META, STAGE_ORDER, prepSecondsForLevel } from '../training/types'
import { sessionStep } from '../training/sessionReducer'
import { useAiEnabled } from '../ai/useAiEnabled'
import { CoachPromo } from './components/CoachPromo'
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
  const { state, updateWith } = useAppState()
  const { sessions } = state
  const aiEnabled = useAiEnabled()

  const summary = useMemo(() => {
    const weekKey = getWeekKey()
    return {
      streak: calculateCurrentStreak(sessions),
      weekly: calculateWeeklyProgress(sessions),
      practicedDays: practicedWeekDays(sessions),
      level: trainingLevelForSessions(sessions),
      weeklyTestAvailable: !state.weeklyTests.some((test) => test.weekKey === weekKey),
      conversationsDone: conversationsThisWeek(state.conversationPractices),
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
    ? `Reprendre ma séance — Étape ${sessionStep(state.inProgressSession).index}/${sessionStep(state.inProgressSession).total}`
    : 'Commencer ma séance'

  return (
    <div className="page home">
      <HomeHero minutes={SESSION_MINUTES} prepSeconds={prepSecondsForLevel(summary.level)} />

      <TodaySessionCard
        minutes={SESSION_MINUTES}
        ctaLabel={ctaLabel}
        onRestart={
          state.inProgressSession
            ? () => updateWith((prev) => setInProgressSession(prev, null))
            : undefined
        }
      />

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
            badge="Hebdo · 20 min"
            title="Test de fluidité disponible"
            description="Tâche connue, questions inconnues, contournement : une fois par semaine."
            to="/progress"
            cta="Faire le test"
            delay={0.3}
          />
        ) : null}
        {summary.conversationsDone < CONVERSATIONS_PER_WEEK.min ? (
          <ChallengeCard
            badge={`Conversation · ${summary.conversationsDone}/${CONVERSATIONS_PER_WEEK.min}–${CONVERSATIONS_PER_WEEK.max}`}
            title="Vraie conversation"
            description="20–30 minutes avec une personne, 2 à 3 fois par semaine."
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

      {aiEnabled ? <CoachPromo /> : null}
    </div>
  )
}
