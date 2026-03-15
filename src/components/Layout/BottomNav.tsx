import { NavLink } from 'react-router-dom'
import { ru } from '../../constants/ru'

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
        {ru.navHome}
      </NavLink>
      <NavLink to="/today" className={({ isActive }) => (isActive ? 'active' : '')}>
        {ru.navToday}
      </NavLink>
      <NavLink to="/beauty" className={({ isActive }) => (isActive ? 'active' : '')}>
        {ru.navBeauty}
      </NavLink>
      <NavLink to="/diary" className={({ isActive }) => (isActive ? 'active' : '')}>
        {ru.navDiary}
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
        {ru.navSettings}
      </NavLink>
    </nav>
  )
}
