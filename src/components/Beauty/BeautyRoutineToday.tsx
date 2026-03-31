import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { BeautyRoutine, BeautyRoutineStep } from '../../lib/supabase'
import type { BeautyProduct } from '../../lib/supabase'
import { ru } from '../../constants/ru'
import { VitaminDayChecklist } from '../Vitamins/VitaminDayChecklist'
import { isRoutineDue, deduplicateByTimeSlot } from '../../lib/beautyRoutineDue'
import { BEAUTY_HABIT_DAYS, fetchBeautySlotStreak } from '../../lib/beautyCareStreak'

type StepWithProduct = {
  step: BeautyRoutineStep
  product: BeautyProduct | null
}

type RoutineWithSteps = {
  routine: BeautyRoutine
  steps: StepWithProduct[]
}

type BeautyRoutineTodayProps = {
  dailyEntryId: string
  userId: string
  entryDate: string
  disabled?: boolean
}

function areBlocksComplete(blocks: RoutineWithSteps[], completed: Set<string>): boolean {
  if (blocks.length === 0) return false
  const ids = blocks.flatMap((b) => b.steps.map((s) => s.step.id))
  if (ids.length === 0) return false
  return ids.every((id) => completed.has(id))
}

type RoutineSlotCardProps = {
  title: string
  emptyMessage: string
  doneShortMessage: string
  blocks: RoutineWithSteps[]
  completedStepIds: Set<string>
  disabled: boolean
  onToggleStep: (routineStepId: string, currentlyCompleted: boolean) => void
  expanded: boolean
  onExpand: () => void
  onCollapse: () => void
  streakSlot?: 'morning' | 'evening'
  streakCount?: number | null
  streakLoading?: boolean
}

function RoutineSlotCard({
  title,
  emptyMessage,
  doneShortMessage,
  blocks,
  completedStepIds,
  disabled,
  onToggleStep,
  expanded,
  onExpand,
  onCollapse,
  streakSlot,
  streakCount = null,
  streakLoading = false,
}: RoutineSlotCardProps) {
  if (blocks.length === 0) {
    return (
      <div className="card beauty-today-slot-card">
        <h3>{title}</h3>
        <p className="empty-state beauty-today-slot-empty">{emptyMessage}</p>
      </div>
    )
  }

  const stepIds = blocks.flatMap((b) => b.steps.map((s) => s.step.id))
  const slotComplete =
    stepIds.length > 0 && stepIds.every((id) => completedStepIds.has(id))
  const summaryOnly = slotComplete && !expanded

  return (
    <div className="card beauty-today-slot-card">
      <h3>{title}</h3>
      {!summaryOnly && !slotComplete && <p className="beauty-today-hint">{ru.beautySlotHint}</p>}
      {slotComplete && (
        <div className="beauty-today-slot-done" role="status">
          <p className="beauty-today-slot-done__title">{doneShortMessage}</p>
        </div>
      )}
      {slotComplete && streakSlot && (
        <div className="beauty-today-slot-streak">
          {streakLoading ? (
            <p className="beauty-today-streak__line beauty-today-streak__line--muted">{ru.loading}</p>
          ) : streakCount !== null ? (
            <>
              <p className="beauty-today-streak__line">
                {(streakSlot === 'morning' ? ru.beautyStreakMorningLine : ru.beautyStreakEveningLine).replace(
                  '{days}',
                  String(streakCount)
                )}
              </p>
              <p className="beauty-today-streak__next">
                {streakCount >= BEAUTY_HABIT_DAYS
                  ? ru.beautyStreakHabitFormed
                  : (streakSlot === 'morning'
                      ? ru.beautyStreakToHabitMorning
                      : ru.beautyStreakToHabitEvening
                    ).replace('{left}', String(Math.max(0, BEAUTY_HABIT_DAYS - streakCount)))}
              </p>
            </>
          ) : null}
        </div>
      )}
      {summaryOnly && (
        <button type="button" className="btn-ghost beauty-today-streak__show-steps" onClick={onExpand}>
          {ru.beautyStreakShowSteps}
        </button>
      )}
      {(!slotComplete || expanded) && (
        <>
          <div className="beauty-today-routines">
            {blocks.map(({ routine, steps }) => (
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
                            onChange={() => onToggleStep(step.id, completed)}
                            disabled={disabled}
                            aria-label={ru.markStepDone}
                          />
                          <span
                            className={
                              completed
                                ? 'beauty-today-step-name beauty-today-step-name--done'
                                : 'beauty-today-step-name'
                            }
                          >
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
          {slotComplete && expanded && (
            <button
              type="button"
              className="btn-ghost beauty-today-streak__hide-steps"
              onClick={onCollapse}
            >
              {ru.beautyStreakHideSteps}
            </button>
          )}
        </>
      )}
    </div>
  )
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
  const [morningStreak, setMorningStreak] = useState<number | null>(null)
  const [eveningStreak, setEveningStreak] = useState<number | null>(null)
  const [streakLoading, setStreakLoading] = useState(false)
  const [globalShowSteps, setGlobalShowSteps] = useState(false)
  const [slotExpand, setSlotExpand] = useState({ morning: false, evening: false, other: false })

  const dueRoutinesWithSteps = useMemo(() => {
    const due = routinesWithSteps.filter(({ routine }) => isRoutineDue(routine, entryDate))
    return deduplicateByTimeSlot(due)
  }, [routinesWithSteps, entryDate])

  const morningDue = useMemo(
    () => dueRoutinesWithSteps.filter((x) => (x.routine.type ?? '') === 'morning'),
    [dueRoutinesWithSteps]
  )
  const eveningDue = useMemo(
    () => dueRoutinesWithSteps.filter((x) => (x.routine.type ?? '') === 'evening'),
    [dueRoutinesWithSteps]
  )
  const otherDue = useMemo(
    () =>
      dueRoutinesWithSteps.filter((x) => {
        const t = x.routine.type ?? ''
        return t !== 'morning' && t !== 'evening'
      }),
    [dueRoutinesWithSteps]
  )

  const allCompleteToday = useMemo(() => {
    if (dueRoutinesWithSteps.length === 0) return false
    const ids = dueRoutinesWithSteps.flatMap(({ steps }) => steps.map(({ step }) => step.id))
    if (ids.length === 0) return false
    return ids.every((id) => completedStepIds.has(id))
  }, [dueRoutinesWithSteps, completedStepIds])

  const morningComplete = useMemo(
    () => areBlocksComplete(morningDue, completedStepIds),
    [morningDue, completedStepIds]
  )
  const eveningComplete = useMemo(
    () => areBlocksComplete(eveningDue, completedStepIds),
    [eveningDue, completedStepIds]
  )
  const otherComplete = useMemo(
    () => otherDue.length > 0 && areBlocksComplete(otherDue, completedStepIds),
    [otherDue, completedStepIds]
  )

  const morningExpanded =
    !morningComplete || (allCompleteToday && globalShowSteps ? true : slotExpand.morning)
  const eveningExpanded =
    !eveningComplete || (allCompleteToday && globalShowSteps ? true : slotExpand.evening)
  const otherExpanded =
    !otherComplete || (allCompleteToday && globalShowSteps ? true : slotExpand.other)

  const showRoutineSlotCards = !allCompleteToday || globalShowSteps

  const needMorningStreak = morningDue.length > 0 && morningComplete
  const needEveningStreak = eveningDue.length > 0 && eveningComplete

  useEffect(() => {
    if (!userId || routinesWithSteps.length === 0 || (!needMorningStreak && !needEveningStreak)) {
      setMorningStreak(null)
      setEveningStreak(null)
      setStreakLoading(false)
      return
    }
    let cancelled = false
    setStreakLoading(true)
    Promise.all([
      needMorningStreak
        ? fetchBeautySlotStreak(userId, entryDate, routinesWithSteps, 'morning')
        : Promise.resolve(null),
      needEveningStreak
        ? fetchBeautySlotStreak(userId, entryDate, routinesWithSteps, 'evening')
        : Promise.resolve(null),
    ])
      .then(([m, e]) => {
        if (!cancelled) {
          setMorningStreak(needMorningStreak && typeof m === 'number' ? m : null)
          setEveningStreak(needEveningStreak && typeof e === 'number' ? e : null)
          setStreakLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMorningStreak(null)
          setEveningStreak(null)
          setStreakLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [
    needMorningStreak,
    needEveningStreak,
    userId,
    entryDate,
    routinesWithSteps,
    completedStepIds,
  ])

  useEffect(() => {
    if (!allCompleteToday) setGlobalShowSteps(false)
  }, [allCompleteToday])

  useEffect(() => {
    if (!morningComplete) setSlotExpand((s) => ({ ...s, morning: false }))
  }, [morningComplete])

  useEffect(() => {
    if (!eveningComplete) setSlotExpand((s) => ({ ...s, evening: false }))
  }, [eveningComplete])

  useEffect(() => {
    if (otherDue.length > 0 && !otherComplete) setSlotExpand((s) => ({ ...s, other: false }))
  }, [otherDue.length, otherComplete])

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

  const showMorningStreakInCard = needMorningStreak && (!allCompleteToday || globalShowSteps)
  const showEveningStreakInCard = needEveningStreak && (!allCompleteToday || globalShowSteps)

  return (
    <>
      {loading ? (
        <div className="card">
          <h3>{ru.beautyRoutineToday}</h3>
          <p className="empty-state">{ru.loading}</p>
        </div>
      ) : (
        <>
          {allCompleteToday && (
            <div className="card beauty-today-streak-card">
              <div className="beauty-today-streak" role="status">
                <p className="beauty-today-streak__title">{ru.beautyStreakPraiseTitle}</p>
                {!globalShowSteps && (needMorningStreak || needEveningStreak) && (
                  <>
                    {streakLoading ? (
                      <p className="beauty-today-streak__line beauty-today-streak__line--muted">
                        {ru.loading}
                      </p>
                    ) : (
                      <>
                        {needMorningStreak && morningStreak !== null && (
                          <div className="beauty-today-streak-slot">
                            <p className="beauty-today-streak__line">
                              {ru.beautyStreakMorningLine.replace('{days}', String(morningStreak))}
                            </p>
                            <p className="beauty-today-streak__next">
                              {morningStreak >= BEAUTY_HABIT_DAYS
                                ? ru.beautyStreakHabitFormed
                                : ru.beautyStreakToHabitMorning.replace(
                                    '{left}',
                                    String(Math.max(0, BEAUTY_HABIT_DAYS - morningStreak))
                                  )}
                            </p>
                          </div>
                        )}
                        {needEveningStreak && eveningStreak !== null && (
                          <div className="beauty-today-streak-slot">
                            <p className="beauty-today-streak__line">
                              {ru.beautyStreakEveningLine.replace('{days}', String(eveningStreak))}
                            </p>
                            <p className="beauty-today-streak__next">
                              {eveningStreak >= BEAUTY_HABIT_DAYS
                                ? ru.beautyStreakHabitFormed
                                : ru.beautyStreakToHabitEvening.replace(
                                    '{left}',
                                    String(Math.max(0, BEAUTY_HABIT_DAYS - eveningStreak))
                                  )}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
              {!globalShowSteps ? (
                <button
                  type="button"
                  className="btn-ghost beauty-today-streak__show-steps"
                  onClick={() => setGlobalShowSteps(true)}
                >
                  {ru.beautyStreakShowSteps}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost beauty-today-streak__hide-steps"
                  onClick={() => setGlobalShowSteps(false)}
                >
                  {ru.beautyStreakHideSteps}
                </button>
              )}
            </div>
          )}

          {showRoutineSlotCards && (
            <>
              <RoutineSlotCard
                title={ru.beautyRoutineMorning}
                emptyMessage={ru.beautySlotEmptyMorning}
                doneShortMessage={ru.beautyMorningDoneShort}
                blocks={morningDue}
                completedStepIds={completedStepIds}
                disabled={disabled}
                onToggleStep={handleToggleStep}
                expanded={morningExpanded}
                onExpand={() => setSlotExpand((s) => ({ ...s, morning: true }))}
                onCollapse={() => setSlotExpand((s) => ({ ...s, morning: false }))}
                streakSlot={showMorningStreakInCard ? 'morning' : undefined}
                streakCount={morningStreak}
                streakLoading={streakLoading && needMorningStreak}
              />
              <RoutineSlotCard
                title={ru.beautyRoutineEvening}
                emptyMessage={ru.beautySlotEmptyEvening}
                doneShortMessage={ru.beautyEveningDoneShort}
                blocks={eveningDue}
                completedStepIds={completedStepIds}
                disabled={disabled}
                onToggleStep={handleToggleStep}
                expanded={eveningExpanded}
                onExpand={() => setSlotExpand((s) => ({ ...s, evening: true }))}
                onCollapse={() => setSlotExpand((s) => ({ ...s, evening: false }))}
                streakSlot={showEveningStreakInCard ? 'evening' : undefined}
                streakCount={eveningStreak}
                streakLoading={streakLoading && needEveningStreak}
              />
              {otherDue.length > 0 && (
                <RoutineSlotCard
                  title={ru.beautyRoutineOther}
                  emptyMessage=""
                  doneShortMessage={ru.beautyOtherDoneShort}
                  blocks={otherDue}
                  completedStepIds={completedStepIds}
                  disabled={disabled}
                  onToggleStep={handleToggleStep}
                  expanded={otherExpanded}
                  onExpand={() => setSlotExpand((s) => ({ ...s, other: true }))}
                  onCollapse={() => setSlotExpand((s) => ({ ...s, other: false }))}
                />
              )}
            </>
          )}

          <div className="card beauty-today-vitamins-card">
            <h3>{ru.vitaminsTitle}</h3>
            <VitaminDayChecklist
              date={entryDate}
              userId={userId}
              disabled={disabled}
              hideHeader
            />
          </div>

          <p className="page-footer-link beauty-today-page-footer" style={{ marginTop: 12 }}>
            <Link to="/beauty" className="link-text">
              {ru.navBeauty}
            </Link>
          </p>
        </>
      )}
    </>
  )
}
