import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import './layout.css'

export function AppShell() {
  const location = useLocation()
  const { warning } = useAppState()
  const isTraining = location.pathname.startsWith('/training')

  return (
    <div className={`shell ${isTraining ? 'shell--training' : ''}`}>
      {warning && !isTraining ? (
        <p className="warning-banner shell__warning" role="status">
          {warning}
        </p>
      ) : null}

      <main className="shell__main">
        <Outlet />
      </main>

      {isTraining ? null : (
        <nav className="shell__nav" aria-label="Navigation principale">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `shell__link ${isActive ? 'shell__link--active' : ''}`
            }
          >
            <span aria-hidden="true">🏠</span>
            Accueil
          </NavLink>
          <NavLink
            to="/progress"
            className={({ isActive }) =>
              `shell__link ${isActive ? 'shell__link--active' : ''}`
            }
          >
            <span aria-hidden="true">📈</span>
            Progression
          </NavLink>
        </nav>
      )}
    </div>
  )
}
