/** Calendar helpers for month mini-grids (вода, уход, витамины). */

export type MonthGrid = {
  dates: string[]
  firstDow: number
  monthStart: string
  monthEnd: string
}

/** Build all YYYY-MM-DD strings in the month of `anchorIso`, plus Monday-based first weekday offset. */
export function getMonthGridFromAnchor(anchorIso: string): MonthGrid {
  const [yStr, mStr] = anchorIso.split('-')
  const Y = Number(yStr)
  const Mo = Number(mStr)
  const lastD = new Date(Y, Mo, 0).getDate()
  const dates: string[] = []
  for (let d = 1; d <= lastD; d++) {
    dates.push(`${yStr}-${mStr}-${String(d).padStart(2, '0')}`)
  }
  const firstDow = (new Date(Y, Mo - 1, 1).getDay() + 6) % 7
  return {
    dates,
    firstDow,
    monthStart: dates[0]!,
    monthEnd: dates[dates.length - 1]!,
  }
}

/** e.g. "1–31 марта 2026 г." */
export function formatMonthPeriodLabel(dates: string[]): string {
  if (dates.length === 0) return ''
  const first = dates[0]!
  const last = dates[dates.length - 1]!
  const from = new Date(first + 'T12:00:00')
  const dayStart = from.getDate()
  const dayEnd = new Date(last + 'T12:00:00').getDate()
  const monthYear = from.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  return `${dayStart}–${dayEnd} ${monthYear}`
}
