import { useState, useMemo } from 'react'
import type { BeautyRoutine, BeautyProduct } from '../../lib/supabase'
import { ru } from '../../constants/ru'

export type RoutineStepRow = {
  stepId?: string
  productId: string
  product?: BeautyProduct | null
}

export type RoutineScheduling = {
  cadence_type: 'daily' | 'weekly' | 'monthly' | 'none'
  weekly_days: number[] | null
  monthly_days: number[] | null
  is_active: boolean
}

const TYPE_OPTIONS = [
  { value: '', label: ru.routineType },
  { value: 'morning', label: ru.routineTypeMorning },
  { value: 'evening', label: ru.routineTypeEvening },
  { value: 'hair', label: ru.routineTypeHair },
  { value: 'custom', label: ru.routineTypeCustom },
]

const CADENCE_OPTIONS: { value: 'none' | 'daily' | 'weekly' | 'monthly'; label: string }[] = [
  { value: 'none', label: ru.cadenceNone },
  { value: 'daily', label: ru.cadenceDaily },
  { value: 'weekly', label: ru.cadenceWeekly },
  { value: 'monthly', label: ru.cadenceMonthly },
]

const WEEKDAY_LABELS = [ru.weekdaySun, ru.weekdayMon, ru.weekdayTue, ru.weekdayWed, ru.weekdayThu, ru.weekdayFri, ru.weekdaySat]

type BeautyRoutineFormProps = {
  routine: BeautyRoutine | null
  initialSteps: RoutineStepRow[]
  products: BeautyProduct[]
  onSave: (name: string, type: string | null, steps: RoutineStepRow[], scheduling: RoutineScheduling) => Promise<void>
  onCancel: () => void
}

export function BeautyRoutineForm({
  routine,
  initialSteps,
  products,
  onSave,
  onCancel,
}: BeautyRoutineFormProps) {
  const [name, setName] = useState(routine?.name ?? '')
  const [type, setType] = useState(routine?.type ?? '')
  const [steps, setSteps] = useState<RoutineStepRow[]>(initialSteps)
  const [cadenceType, setCadenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>(
    (routine?.cadence_type as 'none' | 'daily' | 'weekly' | 'monthly') ?? 'none'
  )
  const [weeklyDays, setWeeklyDays] = useState<number[]>(routine?.weekly_days ?? [])
  const [monthlyDaysText, setMonthlyDaysText] = useState(
    routine?.monthly_days?.length ? routine.monthly_days.sort((a, b) => a - b).join(', ') : ''
  )
  const [isActive, setIsActive] = useState(routine?.is_active !== false)
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthlyDaysArray = useMemo(() => {
    if (!monthlyDaysText.trim()) return []
    return monthlyDaysText
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 31)
  }, [monthlyDaysText])

  const toggleWeekday = (day: number) => {
    setWeeklyDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)))
  }

  const handleAddStep = (product: BeautyProduct) => {
    setSteps((prev) => [...prev, { productId: product.id, product }])
    setShowPicker(false)
  }

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    setSteps((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  const handleMoveDown = (index: number) => {
    if (index >= steps.length - 1) return
    setSteps((prev) => {
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(ru.routineNameRequired)
      return
    }
    setSaving(true)
    setError(null)
    const scheduling: RoutineScheduling = {
      cadence_type: cadenceType,
      weekly_days: cadenceType === 'weekly' ? weeklyDays : null,
      monthly_days: cadenceType === 'monthly' ? monthlyDaysArray : null,
      is_active: isActive,
    }
    try {
      await onSave(trimmedName, type || null, steps, scheduling)
    } catch (err) {
      setError(err instanceof Error ? err.message : ru.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="beauty-product-form-overlay" onClick={onCancel}>
      <div className="beauty-product-form beauty-routine-form" onClick={(e) => e.stopPropagation()}>
        <h2 className="beauty-product-form__title">
          {routine ? ru.editProduct : ru.addRoutine}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="routine-name">{ru.routineName}</label>
            <input
              id="routine-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ru.routineNamePlaceholder}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="routine-type">{ru.routineType}</label>
            <select
              id="routine-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value || 'empty'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>{ru.scheduleTitle}</label>
            <select
              value={cadenceType}
              onChange={(e) => setCadenceType(e.target.value as 'none' | 'daily' | 'weekly' | 'monthly')}
            >
              {CADENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {cadenceType === 'weekly' && (
            <div className="form-group">
              <label>{ru.scheduleWeekdays}</label>
              <div className="beauty-schedule-weekdays">
                {WEEKDAY_LABELS.map((label, i) => (
                  <label key={i} className="beauty-schedule-weekday">
                    <input
                      type="checkbox"
                      checked={weeklyDays.includes(i)}
                      onChange={() => toggleWeekday(i)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {cadenceType === 'monthly' && (
            <div className="form-group">
              <label htmlFor="monthly-days">{ru.scheduleMonthDays}</label>
              <input
                id="monthly-days"
                type="text"
                value={monthlyDaysText}
                onChange={(e) => setMonthlyDaysText(e.target.value)}
                placeholder={ru.scheduleMonthDaysPlaceholder}
              />
            </div>
          )}
          <div className="form-group">
            <label className="beauty-schedule-active-label">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {ru.scheduleActive}
            </label>
          </div>
          <div className="form-group">
            <label>{ru.routineSteps}</label>
            <ul className="beauty-routine-form__steps">
              {steps.map((row, index) => (
                <li key={row.stepId ?? `new-${row.productId}-${index}`} className="beauty-routine-form__step">
                  <span className="beauty-routine-form__step-num">{index + 1}.</span>
                  <span className="beauty-routine-form__step-name">
                    {row.product?.name ?? products.find((p) => p.id === row.productId)?.name ?? '—'}
                  </span>
                  <div className="beauty-routine-form__step-actions">
                    <button
                      type="button"
                      className="beauty-routine-form__step-btn"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      aria-label={ru.moveUp}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="beauty-routine-form__step-btn"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === steps.length - 1}
                      aria-label={ru.moveDown}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="beauty-routine-form__step-btn beauty-routine-form__step-btn--remove"
                      onClick={() => handleRemoveStep(index)}
                      aria-label={ru.removeStep}
                    >
                      {ru.removeStep}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {products.length === 0 ? (
              <p className="beauty-routine-form__hint">{ru.noProductsForStep}</p>
            ) : (
              <button
                type="button"
                className="btn-ghost beauty-routine-form__add-step"
                onClick={() => setShowPicker(true)}
              >
                {ru.addStep}
              </button>
            )}
          </div>
          {error && <p className="beauty-product-form__error" role="alert">{error}</p>}
          <div className="beauty-product-form__actions">
            <button type="button" className="btn-ghost" onClick={onCancel}>
              {ru.cancel}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? ru.loading : ru.save}
            </button>
          </div>
        </form>
      </div>

      {showPicker && (
        <div className="beauty-product-form-overlay beauty-picker-overlay" onClick={() => setShowPicker(false)}>
          <div className="beauty-picker" onClick={(e) => e.stopPropagation()}>
            <h3 className="beauty-picker__title">{ru.pickProduct}</h3>
            <ul className="beauty-picker__list">
              {products.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    className="beauty-picker__item"
                    onClick={() => handleAddStep(product)}
                  >
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="beauty-picker__thumb" />
                    ) : (
                      <span className="beauty-picker__thumb beauty-picker__thumb--empty" />
                    )}
                    <span className="beauty-picker__name">{product.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn-ghost" onClick={() => setShowPicker(false)}>
              {ru.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
