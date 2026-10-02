import { Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import { calculateCurrentStreak } from '../../services/progress/progress'
import { STAGE_ORDER } from '../../features/training/types'
import { AnimatedBackground } from '../Decor/Decor'
import { Brand } from './Brand'
import { MainNav } from './MainNav'
import { StageRail } from './StageRail'
import { StreakCard, StreakChip } from './StreakCard'
import { TabBar } from './TabBar'
import { isSessionPath } from './navigation'
import './layout.css'

export function AppShell() {
  const location = useLocation()
  const { state, warning } = useAppState()
  const inSession = isSessionPath(location.pathname)
  const streak = calculateCurrentStreak(state.sessions)
  const stageIndex = state.inProgressSession?.stageIndex ?? STAGE_ORDER.length

  return (
    <div className={`shell${inSession ? ' shell--session' : ''}`}>
      <AnimatedBackground />

      <aside className="sidebar">
        <div className="sidebar__brand-row">
          <Brand />
          <StreakChip streak={streak} />
        </div>
        {inSession ? (
          <StageRail stageIndex={stageIndex} />
        ) : (
          <>
            <MainNav />
            <StreakCard streak={streak} />
          </>
        )}
      </aside>

      <div className="shell__body">
        {warning ? (
          <p className="warning-banner shell__warning" role="status">
            {warning}
          </p>
        ) : null}
        <main key={location.pathname} className="shell__main">
          <Outlet />
        </main>
        {inSession ? null : <TabBar />}
      </div>
    </div>
  )
}
