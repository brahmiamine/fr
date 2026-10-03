import { NavLink } from 'react-router-dom'
import { Icon } from '../ui'
import { useAiEnabled } from '../../features/ai/useAiEnabled'
import { AI_NAV, MAIN_NAV } from './navigation'

export function MainNav() {
  const aiEnabled = useAiEnabled()
  const items = aiEnabled
    ? [...MAIN_NAV.slice(0, -1), AI_NAV, ...MAIN_NAV.slice(-1)]
    : MAIN_NAV
  return (
    <nav className="main-nav" aria-label="Navigation principale">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `main-nav__link${isActive ? ' is-active' : ''}`}
        >
          <Icon name={item.icon} size={20} />
          {item.label}
          {item.badge ? <span className="main-nav__badge">{item.badge}</span> : null}
        </NavLink>
      ))}
    </nav>
  )
}
