import { NavLink } from 'react-router-dom'
import { Icon } from '../ui'
import { TAB_NAV } from './navigation'

/** Bottom navigation for small screens; the session tab is the raised one. */
export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Navigation mobile">
      {TAB_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `tabbar__item${item.to === '/training' ? ' tabbar__item--main' : ''}${isActive ? ' is-active' : ''}`
          }
        >
          <span className="tabbar__icon">
            <Icon name={item.icon} size={22} strokeWidth={2} />
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}
