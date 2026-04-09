import { ru } from '../constants/ru'

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

/** Calendar day as YYYY-MM-DD (UTC, matches previous `toISOString().slice(0, 10)` usage). */
export function toIsoDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Page title for Today / Tasks: «Сегодня, …» or weekday + date. */
export function formatCalendarDayTitle(date: Date): string {
  const today = toIsoDateString(new Date())
  const ds = toIsoDateString(date)
  const dayMonth = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  if (ds === today) return ru.dateTodayPrefix + dayMonth
  const weekdayDayMonth = date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return weekdayDayMonth.charAt(0).toUpperCase() + weekdayDayMonth.slice(1)
}

/**
 * Format ISO date (YYYY-MM-DD) to Russian short form: "17 марта"
 */
export function formatDateRussian(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number)
  if (!d || !m || m < 1 || m > 12) return isoDate
  const day = d
  const month = MONTHS_RU[m - 1]
  return `${day} ${month}`
}
