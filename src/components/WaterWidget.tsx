import { useCallback } from 'react'
import { ru } from '../constants/ru'
import type { DailyEntry } from '../lib/supabase'

const ML_PER_TAP = 250
const DEFAULT_GOAL_ML = 2000

type WaterWidgetProps = {
  entry: DailyEntry | null
  goalMl?: number
  onAddWater: () => void
  onUpdateEntry?: (updates: { water_ml: number }) => Promise<void>
  disabled?: boolean
  className?: string
}

export function WaterWidget({
  entry,
  goalMl = DEFAULT_GOAL_ML,
  onAddWater,
  onUpdateEntry,
  disabled = false,
  className,
}: WaterWidgetProps) {
  const currentMl = entry?.water_ml ?? 0
  const fillPercent = Math.min(100, (currentMl / goalMl) * 100)

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
    </div>
  )
}
