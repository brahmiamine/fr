import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import { Logo } from '../Brand/Logo'
import { AnimatedBackground } from '../Decor/Decor'
import './layout.css'

export function AppShell() {
  const location = useLocation()
  const { warning } = useAppState()
  const isFocus =
    location.pathname.startsWith('/training') ||
    location.pathname.startsWith('/prosody')

  return (
    <div className={`site ${isFocus ? 'site--focus' : ''}`}>
      <AnimatedBackground />

      <header className="site__header">
        <div className="site__header-inner">
          <Link to="/" className="site__brand">
            <Logo />
            <span className="site__brand-text">
              Parle+
              <small>français parlé</small>
            </span>
          </Link>

          {!isFocus ? (
            <nav className="site__nav" aria-label="Navigation principale">
              <NavLink
                to="/"
                end
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                Accueil
              </NavLink>
              <NavLink
                to="/prosody"
                className={({ isActive }) => (isActive ? 'is-active' : undefined)}
              >
                Prosodie
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

      {!isFocus ? (
        <footer className="site__footer">
          <div className="site__footer-inner">
            <p>
              Parle+ — entraîneur de français parlé. Ta progression reste
              stockée localement sur ton appareil.
            </p>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
