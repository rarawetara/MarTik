import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { BeautyRoutine, BeautyRoutineStep } from '../../lib/supabase'
import type { BeautyProduct } from '../../lib/supabase'
import { ru } from '../../constants/ru'

type StepWithProduct = {
  step: BeautyRoutineStep
  product: BeautyProduct | null
}

type RoutineWithSteps = {
  routine: BeautyRoutine
  steps: StepWithProduct[]
}

/** Returns true if routine is due on the given date (YYYY-MM-DD). MVP: none/unset = always due. */
function isRoutineDue(routine: BeautyRoutine, entryDate: string): boolean {
  if (routine.is_active === false) return false
  const ct = routine.cadence_type ?? 'none'
  if (ct === 'none') return true
  if (ct === 'daily') return true
  if (ct === 'weekly') {
    const d = new Date(entryDate + 'T12:00:00')
    const weekday = d.getDay()
    const days = routine.weekly_days ?? []
    return days.includes(weekday)
  }
  if (ct === 'monthly') {
    const d = new Date(entryDate + 'T12:00:00')
    const dayOfMonth = d.getDate()
    const days = routine.monthly_days ?? []
    return days.includes(dayOfMonth)
  }
  return true
}

type BeautyRoutineTodayProps = {
  dailyEntryId: string
  userId: string
  /** Date for due filtering (YYYY-MM-DD). Required for Phase 2F. */
  entryDate: string
  disabled?: boolean
}

export function BeautyRoutineToday({
  dailyEntryId,
  userId,
  entryDate,
  disabled = false,
}: BeautyRoutineTodayProps) {
  const [routinesWithSteps, setRoutinesWithSteps] = useState<RoutineWithSteps[]>([])
  const [completedStepIds, setCompletedStepIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const dueRoutinesWithSteps = useMemo(
    () => routinesWithSteps.filter(({ routine }) => isRoutineDue(routine, entryDate)),
    [routinesWithSteps, entryDate]
  )

  const refetchLogs = useCallback(async () => {
    if (!dailyEntryId) return
    const { data: logsData, error } = await supabase
      .from('beauty_logs')
      .select('routine_step_id')
      .eq('daily_entry_id', dailyEntryId)
    if (error) {
      console.error('Beauty logs fetch error:', error)
      return
    }
    const logs = (logsData as { routine_step_id: string }[]) ?? []
    setCompletedStepIds(new Set(logs.map((l) => l.routine_step_id)))
  }, [dailyEntryId])

  const fetchData = useCallback(async () => {
    if (!dailyEntryId || !userId) {
      setRoutinesWithSteps([])
      setCompletedStepIds(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data: routinesData, error: routinesError } = await supabase
        .from('beauty_routines')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
      if (routinesError) {
        console.error('Beauty routines fetch error:', routinesError)
        setRoutinesWithSteps([])
        setCompletedStepIds(new Set())
        return
      }
      const routines = (routinesData as BeautyRoutine[]) ?? []
      const withSteps: RoutineWithSteps[] = []
      for (const routine of routines) {
        const { data: stepsData, error: stepsError } = await supabase
          .from('beauty_routine_steps')
          .select('*, beauty_products(*)')
          .eq('routine_id', routine.id)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true })
        if (stepsError) {
          console.error('Beauty routine steps fetch error:', stepsError)
          continue
        }
        const rows =
          (stepsData as Array<BeautyRoutineStep & { beauty_products: BeautyProduct | null }>) ?? []
        withSteps.push({
          routine,
          steps: rows.map((row) => ({
            step: {
              id: row.id,
              routine_id: row.routine_id,
              product_id: row.product_id,
              sort_order: row.sort_order,
              deleted_at: row.deleted_at,
              created_at: row.created_at,
              updated_at: row.updated_at,
            },
            product: row.beauty_products ?? null,
          })),
        })
      }
      setRoutinesWithSteps(withSteps)
      const { data: logsData, error: logsError } = await supabase
        .from('beauty_logs')
        .select('routine_step_id')
        .eq('daily_entry_id', dailyEntryId)
      if (logsError) {
        console.error('Beauty logs fetch error:', logsError)
        setCompletedStepIds(new Set())
        return
      }
      const logs = (logsData as { routine_step_id: string }[]) ?? []
      setCompletedStepIds(new Set(logs.map((l) => l.routine_step_id)))
    } catch (e) {
      console.error('BeautyRoutineToday fetch error:', e)
      setRoutinesWithSteps([])
      setCompletedStepIds(new Set())
    } finally {
      setLoading(false)
    }
  }, [dailyEntryId, userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleToggleStep = useCallback(
    async (routineStepId: string, currentlyCompleted: boolean) => {
      if (disabled || !dailyEntryId) return
      if (currentlyCompleted) {
        const { error } = await supabase
          .from('beauty_logs')
          .delete()
          .eq('daily_entry_id', dailyEntryId)
          .eq('routine_step_id', routineStepId)
        if (error) {
          console.error('Beauty log delete error:', error)
          await refetchLogs()
          return
        }
      } else {
        const { error } = await supabase.from('beauty_logs').insert({
          daily_entry_id: dailyEntryId,
          routine_step_id: routineStepId,
        })
        if (error) {
          console.error('Beauty log insert error:', error)
          await refetchLogs()
          return
        }
      }
      await refetchLogs()
    },
    [dailyEntryId, disabled, refetchLogs]
  )

  if (loading) {
    return (
      <div className="card">
        <h3>{ru.beautyRoutineToday}</h3>
        <p className="empty-state">{ru.loading}</p>
      </div>
    )
  }

  if (dueRoutinesWithSteps.length === 0) {
    return (
      <div className="card">
        <h3>{ru.beautyRoutineToday}</h3>
        <p className="beauty-today-hint">{ru.beautyRoutineTodayHint}</p>
        <p className="empty-state">{ru.noRoutinesForToday}</p>
        <p className="page-footer-link" style={{ marginTop: 8 }}>
          <Link to="/beauty" className="link-text">
            {ru.navBeauty}
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>{ru.beautyRoutineToday}</h3>
      <p className="beauty-today-hint">{ru.beautyRoutineTodayHint}</p>
      <div className="beauty-today-routines">
        {dueRoutinesWithSteps.map(({ routine, steps }) => (
          <div key={routine.id} className="beauty-today-routine">
            <h4 className="beauty-today-routine-name">{routine.name}</h4>
            <ul className="beauty-today-steps" aria-label={ru.routineSteps}>
              {steps.map(({ step, product }) => {
                const completed = completedStepIds.has(step.id)
                return (
                  <li key={step.id} className="beauty-today-step">
                    <label className="beauty-today-step-label">
                      <input
                        type="checkbox"
                        checked={completed}
                        onChange={() => handleToggleStep(step.id, completed)}
                        disabled={disabled}
                        aria-label={ru.markStepDone}
                      />
                      <span className={completed ? 'beauty-today-step-name beauty-today-step-name--done' : 'beauty-today-step-name'}>
                        {product?.name ?? '—'}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="page-footer-link" style={{ marginTop: 12 }}>
        <Link to="/beauty" className="link-text">
          {ru.navBeauty}
        </Link>
      </p>
    </div>
  )
}
