import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import { Logo } from '../Brand/Logo'
import { AnimatedBackground } from '../Decor/Decor'
import './layout.css'

export function AppShell() {
  const location = useLocation()
  const { warning } = useAppState()
  const isTraining = location.pathname.startsWith('/training')

  return (
    <div className={`site ${isTraining ? 'site--focus' : ''}`}>
      <AnimatedBackground />

      <header className="site__header">
        <div className="site__header-inner">
          <Link to="/" className="site__brand">
            <Logo />
            <span className="site__brand-text">
              Fluidité
              <small>français parlé</small>
            </span>
          </Link>

          {!isTraining ? (
            <nav className="site__nav" aria-label="Navigation principale">
              <NavLink
                to="/"
                end
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                Accueil
              </NavLink>
              <NavLink
                to="/progress"
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                Progression
              </NavLink>
            </nav>
          ) : null}
        </div>
        {warning ? (
          <p className="warning-banner site__warning" role="status">
            {warning}
          </p>
        ) : null}
      </header>

      <main key={location.pathname} className="site__main">
        <Outlet />
      </main>

      {!isTraining ? (
        <footer className="site__footer">
          <div className="site__footer-inner">
            <p>
              Fluidité — entraîneur de français parlé. Ta progression reste
              stockée localement sur ton appareil.
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
