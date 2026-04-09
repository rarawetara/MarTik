import { NavLink } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  Heart,
  Home,
  Settings2,
  Shirt,
  Sparkles,
} from 'lucide-react'
import { ru } from '../../constants/ru'

const items: {
  to: string
  end?: boolean
  label: string
  Icon: typeof Home
}[] = [
  { to: '/', end: true, label: ru.navHome, Icon: Home },
  { to: '/today', label: ru.navToday, Icon: CalendarDays },
  { to: '/tasks', label: ru.navTasks, Icon: CheckSquare },
  { to: '/beauty', label: ru.navBeauty, Icon: Sparkles },
  { to: '/wishlist', label: ru.navWishlist, Icon: Heart },
  { to: '/wardrobe', label: ru.navWardrobe, Icon: Shirt },
  { to: '/diary', label: ru.navDiary, Icon: BookOpen },
  { to: '/settings', label: ru.navSettings, Icon: Settings2 },
]

export function SideNav() {
  return (
    <nav className="side-nav" aria-label="Основная навигация">
      {items.map(({ to, end, label, Icon }) => (
        <NavLink
          key={to + (end ? '-index' : '')}
          to={to}
          end={end}
          title={label}
          className={({ isActive }) =>
            `side-nav__link${isActive ? ' side-nav__link--active' : ''}`
          }
        >
          <Icon className="side-nav__icon" size={20} strokeWidth={1.5} aria-hidden />
          <span className="side-nav__label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
