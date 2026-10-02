import { NavLink } from 'react-router-dom'
import { Icon } from '../ui'
import { MAIN_NAV } from './navigation'

export function MainNav() {
  return (
    <nav className="main-nav" aria-label="Navigation principale">
      {MAIN_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `main-nav__link${isActive ? ' is-active' : ''}`}
        >
          <Icon name={item.icon} size={20} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
