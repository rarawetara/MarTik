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
}

export function WaterWidget({
  entry,
  goalMl = DEFAULT_GOAL_ML,
  onAddWater,
  onUpdateEntry,
  disabled = false,
}: WaterWidgetProps) {
  const currentMl = entry?.water_ml ?? 0
  const fillPercent = Math.min(100, (currentMl / goalMl) * 100)

  const handleTap = useCallback(() => {
    const nextMl = currentMl + ML_PER_TAP
    onAddWater()
    onUpdateEntry?.({ water_ml: nextMl })
  }, [currentMl, onAddWater, onUpdateEntry])

  return (
    <div className="card">
      <h3>{ru.water}</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleTap}
          disabled={disabled}
          className="water-glass"
          aria-label={ru.addWater}
          title={ru.addWater}
        >
          <div
            className="water-fill"
            style={{ height: `${fillPercent}%` }}
          />
        </button>
        <div>
          <p style={{ margin: 0, fontSize: '1rem' }}>
            <strong>{currentMl} мл</strong>
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#666' }}>
            {ru.waterGoal}: {goalMl} мл
          </p>
          <button
            type="button"
            onClick={handleTap}
            disabled={disabled}
            className="btn-ghost"
            style={{ marginTop: 8 }}
          >
            {ru.addWater}
          </button>
        </div>
      </div>
    </div>
  )
}
