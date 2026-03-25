const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

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
