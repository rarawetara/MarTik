import { useMemo } from 'react'
import { ru } from '../../constants/ru'
import { formatMonthPeriodLabel } from '../../lib/monthCalendar'

export type CareMonthCell = 'future' | 'no_entry' | 'na' | 'pending' | 'done'

type Props = {
  monthLabel: string
  /** App "today" (daily entry date) — days after this render as future */
  today: string
  dates: string[]
  firstDow: number
  morning: CareMonthCell[]
  evening: CareMonthCell[]
}

/** Same 0–4 scale as витаминов: l0…l4 (розовая интенсивность). */
function cellLevel(state: CareMonthCell): 0 | 1 | 2 | 3 | 4 {
  switch (state) {
    case 'pending':
      return 3
    case 'done':
      return 4
    case 'future':
    case 'no_entry':
    case 'na':
    default:
      return 0
  }
}

function cellClass(state: CareMonthCell, isToday: boolean): string {
  const l = cellLevel(state)
  return [
    'home-vitamin-micro__cell',
    `home-vitamin-micro__cell--l${l}`,
    isToday ? 'home-vitamin-micro__cell--today' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function MonthRowGrid({
  padCount,
  dates,
  today,
  cells,
  slotKey,
}: {
  padCount: number
  dates: string[]
  today: string
  cells: CareMonthCell[]
  slotKey: string
}) {
  const padCells = Array.from({ length: padCount }, (_, i) => (
    <div key={`${slotKey}-pad-${i}`} className="home-vitamin-micro__cell home-vitamin-micro__cell--pad" aria-hidden />
  ))

  return (
    <div className="home-vitamin-micro__grid">
      {padCells}
      {dates.map((d, i) => {
        const isToday = d === today
        return (
          <div
            key={`${slotKey}-${d}`}
            className={cellClass(cells[i] ?? 'na', isToday)}
            title={d}
          />
        )
      })}
    </div>
  )
}

export function CareRoutineMonthMicro({ monthLabel, today, dates, firstDow, morning, evening }: Props) {
  const periodLabel = useMemo(() => formatMonthPeriodLabel(dates), [dates])

  return (
    <div
      className="home-care-month-split home-vitamin-micro"
      role="img"
      aria-label={`${ru.homeCareMorningEvening}: ${monthLabel}`}
    >
      <div className="home-care-month-split__period">
        <span className="home-care-month-split__range">{periodLabel || monthLabel}</span>
      </div>

      <section className="home-care-month-split__slot" aria-label={ru.homeCareMorningShort}>
        <div className="home-vitamin-micro__row home-care-month-split__row">
          <p className="home-vitamin-micro__label">{ru.homeCareMorningShort}</p>
        </div>
        <MonthRowGrid
          padCount={firstDow}
          dates={dates}
          today={today}
          cells={morning}
          slotKey="m"
        />
      </section>

      <section className="home-care-month-split__slot" aria-label={ru.homeCareEveningShort}>
        <div className="home-vitamin-micro__row home-care-month-split__row">
          <p className="home-vitamin-micro__label">{ru.homeCareEveningShort}</p>
        </div>
        <MonthRowGrid
          padCount={firstDow}
          dates={dates}
          today={today}
          cells={evening}
          slotKey="e"
        />
      </section>
    </div>
  )
}
