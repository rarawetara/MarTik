import { useCallback, useEffect, useMemo, useState } from 'react'
import { ru } from '../constants/ru'
import type { DailyEntry } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { formatMonthPeriodLabel, getMonthGridFromAnchor } from '../lib/monthCalendar'

const ML_PER_TAP = 250
const DEFAULT_GOAL_ML = 2000

/** l0…l4 по доле от цели (как витамины / уход). */
function waterIntensityLevel(
  dateStr: string,
  todayStr: string,
  waterByDate: Map<string, number>,
  goalMl: number
): 0 | 1 | 2 | 3 | 4 {
  if (dateStr > todayStr) return 0
  if (!waterByDate.has(dateStr)) return 0
  const m = waterByDate.get(dateStr) ?? 0
  if (goalMl <= 0) return m > 0 ? 4 : 0
  const pct = m / goalMl
  if (pct >= 1) return 4
  if (pct >= 0.75) return 3
  if (pct >= 0.4) return 2
  if (pct > 0) return 1
  return 0
}

type WaterWidgetProps = {
  entry: DailyEntry | null
  goalMl?: number
  onAddWater: () => void
  onUpdateEntry?: (updates: { water_ml: number }) => Promise<void>
  disabled?: boolean
  className?: string
  /** Показать месячную сетку (нужны оба). */
  userId?: string | null
  monthAnchorDate?: string | null
}

export function WaterWidget({
  entry,
  goalMl = DEFAULT_GOAL_ML,
  onAddWater,
  onUpdateEntry,
  disabled = false,
  className,
  userId,
  monthAnchorDate,
}: WaterWidgetProps) {
  const currentMl = entry?.water_ml ?? 0
  const fillPercent = Math.min(100, (currentMl / goalMl) * 100)

  const [waterMonthLoading, setWaterMonthLoading] = useState(false)
  const [waterMonthGrid, setWaterMonthGrid] = useState<{
    dates: string[]
    firstDow: number
    today: string
    byDate: Map<string, number>
  } | null>(null)

  useEffect(() => {
    if (!userId || !monthAnchorDate) {
      setWaterMonthGrid(null)
      return
    }
    let cancelled = false
    const { dates, firstDow, monthStart, monthEnd } = getMonthGridFromAnchor(monthAnchorDate)

    ;(async () => {
      setWaterMonthLoading(true)
      const { data, error } = await supabase
        .from('daily_entries')
        .select('entry_date, water_ml')
        .eq('user_id', userId)
        .gte('entry_date', monthStart)
        .lte('entry_date', monthEnd)
      if (cancelled) return
      if (error) {
        console.error('Water month fetch:', error)
        setWaterMonthGrid(null)
        setWaterMonthLoading(false)
        return
      }
      const byDate = new Map<string, number>()
      for (const row of (data as { entry_date: string; water_ml: number }[]) ?? []) {
        byDate.set(row.entry_date, row.water_ml ?? 0)
      }
      setWaterMonthGrid({
        dates,
        firstDow,
        today: monthAnchorDate,
        byDate,
      })
      setWaterMonthLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [userId, monthAnchorDate, goalMl, entry?.water_ml, entry?.entry_date])

  const periodLabel = useMemo(
    () => (waterMonthGrid ? formatMonthPeriodLabel(waterMonthGrid.dates) : ''),
    [waterMonthGrid]
  )

  const handleAdd = useCallback(() => {
    const nextMl = currentMl + ML_PER_TAP
    onAddWater()
    onUpdateEntry?.({ water_ml: nextMl })
  }, [currentMl, onAddWater, onUpdateEntry])

  const handleRemove = useCallback(() => {
    if (currentMl <= 0) return
    const nextMl = Math.max(0, currentMl - ML_PER_TAP)
    onUpdateEntry?.({ water_ml: nextMl })
  }, [currentMl, onUpdateEntry])

  const showMonth = Boolean(userId && monthAnchorDate)

  return (
    <div
      className={['dashboard-card', 'dashboard-card--primary', 'dashboard-card-water', className]
        .filter(Boolean)
        .join(' ')}
    >
      <h3 className="dashboard-card-title">{ru.water}</h3>
      <div className="water-widget-inner">
        <div className="water-progress-ring" aria-hidden>
          <svg viewBox="0 0 36 36" className="water-ring-svg">
            <path
              className="water-ring-bg"
              d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
              fill="none"
              strokeWidth="3"
            />
            <path
              className="water-ring-fill"
              strokeDasharray={`${fillPercent * 0.97}, 97`}
              d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
              fill="none"
              strokeWidth="3"
            />
          </svg>
          <span className="water-ring-value">{Math.round(fillPercent)}%</span>
        </div>
        <div className="water-widget-info">
          <p className="water-widget-ml">
            <strong>{currentMl} мл</strong>
          </p>
          <p className="water-widget-goal">
            {ru.waterGoal}: {goalMl} мл
          </p>
          <div className="water-actions">
            <button
              type="button"
              onClick={handleAdd}
              disabled={disabled}
              className="dashboard-btn-primary water-add-btn"
              aria-label={ru.addWater}
            >
              {ru.addWater}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || currentMl <= 0}
              className="water-undo-btn"
              aria-label="Отменить последний стакан"
              title="Отменить −250 мл"
            >
              −250
            </button>
          </div>
        </div>
      </div>

      {showMonth && (
        <div className="water-widget-month">
          {waterMonthLoading || !waterMonthGrid ? (
            <p className="water-widget-month__loading ds-muted">{ru.loading}</p>
          ) : (
            <>
              <div className="home-care-month-split__period">
                <span className="home-care-month-split__range">{periodLabel}</span>
              </div>
              <p className="water-widget-month__hint">{ru.waterMonthHint}</p>
              <div
                className="home-vitamin-micro__grid"
                role="img"
                aria-label={`${ru.water}: ${periodLabel}`}
              >
                {Array.from({ length: waterMonthGrid.firstDow }, (_, i) => (
                  <div
                    key={`wp-${i}`}
                    className="home-vitamin-micro__cell home-vitamin-micro__cell--pad"
                    aria-hidden
                  />
                ))}
                {waterMonthGrid.dates.map((d) => {
                  const isToday = d === waterMonthGrid.today
                  const l = waterIntensityLevel(d, waterMonthGrid.today, waterMonthGrid.byDate, goalMl)
                  return (
                    <div
                      key={d}
                      className={[
                        'home-vitamin-micro__cell',
                        `home-vitamin-micro__cell--l${l}`,
                        isToday ? 'home-vitamin-micro__cell--today' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={`${d}: ${waterMonthGrid.byDate.get(d) ?? 0} / ${goalMl} мл`}
                    />
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
