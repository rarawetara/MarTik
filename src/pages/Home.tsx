import { Link } from 'react-router-dom'
import { Camera, GripVertical } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGetOrCreateToday } from '../hooks/useGetOrCreateToday'
import { WaterWidget } from '../components/WaterWidget'
import { supabase } from '../lib/supabase'
import { ru } from '../constants/ru'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Profile, Outfit, OutfitItem, WardrobeItem, BeautyRoutine, BeautyRoutineStep } from '../lib/supabase'
import { OUTFIT_SLOT_TYPES } from '../lib/supabase'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  MouseSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useWidgetLayout, type Side, type SlotPos, type WidgetId, SLOT_POSITIONS } from '../hooks/useWidgetLayout'
import { VitaminMonthMicro } from '../components/Vitamins/VitaminMonthMicro'
import { CareRoutineMonthMicro, type CareMonthCell } from '../components/Beauty/CareRoutineMonthMicro'
import { isRoutineDue, deduplicateByTimeSlot } from '../lib/beautyRoutineDue'

function WidgetSlot({ slotId, empty, isDraggingAny, children }: {
  slotId: string; empty: boolean; isDraggingAny: boolean; children?: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slotId })
  return (
    <div
      ref={setNodeRef}
      className={[
        'widget-slot',
        isOver && 'widget-slot--over',
        empty && isDraggingAny && 'widget-slot--empty-hint',
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  )
}

function DraggableWidget({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0 : 1, height: '100%', position: 'relative' }}>
      <div className="widget-drag-handle" {...listeners} {...attributes} title="Перетащить">
        <GripVertical size={13} strokeWidth={2} aria-hidden />
      </div>
      {children}
    </div>
  )
}

type OutfitWithItems = Outfit & {
  items: (OutfitItem & { wardrobe_items: WardrobeItem | null })[]
}

type RoutineProgress = { id: string; name: string; completed: number; total: number }

type RoutineWithStepIds = { routine: BeautyRoutine; steps: { id: string }[] }

type CareMonthState = {
  monthLabel: string
  today: string
  dates: string[]
  firstDow: number
  morning: CareMonthCell[]
  evening: CareMonthCell[]
}

function computeCareCell(
  entryId: string | undefined,
  winner: RoutineWithStepIds | undefined,
  logsByEntry: Map<string, Set<string>>
): CareMonthCell {
  if (!winner || winner.steps.length === 0) return 'na'
  if (!entryId) return 'no_entry'
  const logs = logsByEntry.get(entryId) ?? new Set()
  const allDone = winner.steps.every((s) => logs.has(s.id))
  return allDone ? 'done' : 'pending'
}

function getGreeting(displayName: string | null | undefined): string {
  const h = new Date().getHours()
  let base: string
  if (h < 12) base = ru.goodMorning
  else if (h < 18) base = ru.goodAfternoon
  else base = ru.goodEvening
  const name = displayName?.trim()
  if (name) return `${base}, ${name}`
  return base
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Monday–Sunday of the week containing the given date (ISO YYYY-MM-DD). */
function getWeekDates(anchorDate: string): string[] {
  const d = new Date(anchorDate + 'T12:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const out: string[] = []
  for (let i = 0; i < 7; i++) {
    out.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return out
}

const MOOD_LABELS: Record<string, string> = {
  calm: 'Спокойствие',
  energetic: 'Энергия',
  tired: 'Усталость',
  happy: 'Радость',
  sad: 'Грусть',
  neutral: 'Нейтрально',
}

type DayState = 'empty' | 'started' | 'forming' | 'almost' | 'complete'

function calcDayState(pillars: {
  waterDone: boolean
  careDone: boolean
  tasksDone: boolean
  outfitDone: boolean
  journalDone: boolean
}): DayState {
  const count = Object.values(pillars).filter(Boolean).length
  if (count === 0) return 'empty'
  if (count === 1) return 'started'
  if (count <= 3) return 'forming'
  if (count === 4) return 'almost'
  return 'complete'
}

const DAY_STATE_LABELS: Record<DayState, string> = {
  empty: 'Ещё пустой',
  started: 'Начинается',
  forming: 'Складывается',
  almost: 'Почти собран',
  complete: 'Собран',
}

const DAY_STATE_SUBS: Record<DayState, string> = {
  empty: 'С чего начнём день?',
  started: 'Что-то уже есть.',
  forming: 'День набирает форму.',
  almost: 'Почти всё на месте.',
  complete: 'День собран. Можно выдохнуть.',
}

export function Home() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const { entry, loading: entryLoading, refetch } = useGetOrCreateToday(user?.id, profile?.timezone)
  const [todayOutfit, setTodayOutfit] = useState<OutfitWithItems | null>(null)
  const [outfitLoading, setOutfitLoading] = useState(false)
  const [weekPlannedDates, setWeekPlannedDates] = useState<Set<string>>(new Set())
  const [routineProgress, setRoutineProgress] = useState<RoutineProgress[]>([])
  const [careMonth, setCareMonth] = useState<CareMonthState | null>(null)
  const [hasAnyRoutines, setHasAnyRoutines] = useState(false)
  const [routinesLoading, setRoutinesLoading] = useState(false)
  const [taskTotal, setTaskTotal] = useState(0)
  const [tasksLoading, setTasksLoading] = useState(false)
  const [prevDayHadEntry, setPrevDayHadEntry] = useState(false)
  const { layout, updateLayout } = useWidgetLayout()
  const [activeWidget, setActiveWidget] = useState<WidgetId | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  )

  function findWidgetSlot(widgetId: WidgetId): { side: Side; pos: SlotPos } | null {
    for (const side of ['left', 'right'] as Side[]) {
      for (const pos of SLOT_POSITIONS) {
        if (layout[side][pos] === widgetId) return { side, pos }
      }
    }
    return null
  }

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data as Profile | null))
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || !entry?.entry_date) {
      setTodayOutfit(null)
      return
    }
    setOutfitLoading(true)
    let cancelled = false
    const load = async () => {
      try {
        const { data: planned } = await supabase
          .from('planned_outfits')
          .select('outfit_id')
          .eq('user_id', user.id)
          .eq('planned_date', entry.entry_date)
          .maybeSingle()
        if (cancelled) return
        if (!planned?.outfit_id) {
          setTodayOutfit(null)
          return
        }
        const { data: outfitData, error: outfitError } = await supabase
          .from('outfits')
          .select('*')
          .eq('id', planned.outfit_id)
          .single()
        if (cancelled) return
        if (outfitError || !outfitData) {
          setTodayOutfit(null)
          return
        }
        const { data: itemsData } = await supabase
          .from('outfit_items')
          .select('*, wardrobe_items(*)')
          .eq('outfit_id', outfitData.id)
          .order('sort_order', { ascending: true })
        const items = (itemsData as (OutfitItem & { wardrobe_items: WardrobeItem | null })[]) ?? []
        if (!cancelled) setTodayOutfit({ ...(outfitData as Outfit), items })
      } finally {
        if (!cancelled) setOutfitLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id, entry?.entry_date])

  useEffect(() => {
    if (!user?.id || !entry?.entry_date) {
      setWeekPlannedDates(new Set())
      return
    }
    const weekDates = getWeekDates(entry.entry_date)
    supabase
      .from('planned_outfits')
      .select('planned_date')
      .eq('user_id', user.id)
      .in('planned_date', weekDates)
      .then(({ data }) => {
        const set = new Set<string>()
        ;(data ?? []).forEach((row: { planned_date: string }) => set.add(row.planned_date))
        setWeekPlannedDates(set)
      })
  }, [user?.id, entry?.entry_date])

  useEffect(() => {
    if (!user?.id || !entry?.id || !entry?.entry_date) {
      setRoutineProgress([])
      setCareMonth(null)
      setHasAnyRoutines(false)
      setRoutinesLoading(false)
      return
    }
    setRoutinesLoading(true)
    const load = async () => {
      const { data: routinesData } = await supabase
        .from('beauty_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
      const routines = (routinesData as BeautyRoutine[]) ?? []
      const routinesWithSteps: RoutineWithStepIds[] = []
      for (const routine of routines) {
        const { data: stepsData } = await supabase
          .from('beauty_routine_steps')
          .select('id')
          .eq('routine_id', routine.id)
          .is('deleted_at', null)
        const steps = (stepsData as Pick<BeautyRoutineStep, 'id'>[]) ?? []
        routinesWithSteps.push({ routine, steps })
      }

      setHasAnyRoutines(routinesWithSteps.length > 0)

      const { data: logsData } = await supabase
        .from('beauty_logs')
        .select('routine_step_id')
        .eq('daily_entry_id', entry.id)
      const completedStepIds = new Set((logsData as { routine_step_id: string }[] ?? []).map((l) => l.routine_step_id))

      const dueToday = routinesWithSteps.filter(({ routine }) => isRoutineDue(routine, entry.entry_date))
      const dedupedToday = deduplicateByTimeSlot(dueToday)
      const progress: RoutineProgress[] = dedupedToday.map(({ routine, steps }) => ({
        id: routine.id,
        name: routine.name,
        completed: steps.filter((s) => completedStepIds.has(s.id)).length,
        total: steps.length,
      }))
      setRoutineProgress(progress)

      if (routinesWithSteps.length === 0) {
        setCareMonth(null)
        setRoutinesLoading(false)
        return
      }

      const anchor = entry.entry_date
      const [yStr, mStr] = anchor.split('-')
      const Y = Number(yStr)
      const Mo = Number(mStr)
      const lastD = new Date(Y, Mo, 0).getDate()
      const dates: string[] = []
      for (let d = 1; d <= lastD; d++) {
        dates.push(`${yStr}-${mStr}-${String(d).padStart(2, '0')}`)
      }
      const monthLabel = new Date(Y, Mo - 1, 15).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
      const monthStart = `${yStr}-${mStr}-01`
      const monthEnd = `${yStr}-${mStr}-${String(lastD).padStart(2, '0')}`

      const { data: entriesData } = await supabase
        .from('daily_entries')
        .select('id, entry_date')
        .eq('user_id', user.id)
        .gte('entry_date', monthStart)
        .lte('entry_date', monthEnd)
      const entriesList = (entriesData as { id: string; entry_date: string }[]) ?? []
      const entryByDate = new Map(entriesList.map((e) => [e.entry_date, e.id]))
      const entryIds = entriesList.map((e) => e.id)

      const logsByEntry = new Map<string, Set<string>>()
      if (entryIds.length > 0) {
        const { data: monthLogs } = await supabase
          .from('beauty_logs')
          .select('daily_entry_id, routine_step_id')
          .in('daily_entry_id', entryIds)
        for (const row of (monthLogs as { daily_entry_id: string; routine_step_id: string }[]) ?? []) {
          if (!logsByEntry.has(row.daily_entry_id)) logsByEntry.set(row.daily_entry_id, new Set())
          logsByEntry.get(row.daily_entry_id)!.add(row.routine_step_id)
        }
      }

      const firstDow = (new Date(Y, Mo - 1, 1).getDay() + 6) % 7
      const morning: CareMonthCell[] = []
      const evening: CareMonthCell[] = []

      for (const dateStr of dates) {
        if (dateStr > anchor) {
          morning.push('future')
          evening.push('future')
          continue
        }
        const dueDay = routinesWithSteps.filter(({ routine }) => isRoutineDue(routine, dateStr))
        const dedupedDay = deduplicateByTimeSlot(dueDay)
        const mR = dedupedDay.find((x) => x.routine.type === 'morning')
        const eR = dedupedDay.find((x) => x.routine.type === 'evening')
        const eid = entryByDate.get(dateStr)
        morning.push(computeCareCell(eid, mR, logsByEntry))
        evening.push(computeCareCell(eid, eR, logsByEntry))
      }

      setCareMonth({
        dates,
        morning,
        evening,
        firstDow,
        monthLabel,
        today: anchor,
      })
      setRoutinesLoading(false)
    }
    load()
  }, [user?.id, entry?.id, entry?.entry_date])

  useEffect(() => {
    if (!entry?.id) {
      setTaskTotal(0)
      setTasksLoading(false)
      return
    }
    setTasksLoading(true)
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await supabase
          .from('daily_tasks')
          .select('id')
          .eq('daily_entry_id', entry.id)
        if (cancelled) return
        const tasks = (data as { id: string }[]) ?? []
        setTaskTotal(tasks.length)
      } finally {
        if (!cancelled) setTasksLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [entry?.id])

  // Check if there was a gap in entries (for gentle recovery message)
  useEffect(() => {
    if (!user?.id || !entry?.entry_date) return
    const yesterday = new Date(entry.entry_date + 'T12:00:00')
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().slice(0, 10)
    supabase
      .from('daily_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('entry_date', yStr)
      .maybeSingle()
      .then(({ data }) => setPrevDayHadEntry(!!data))
  }, [user?.id, entry?.entry_date])

  const handleAddWater = useCallback(() => {
    refetch()
  }, [refetch])

  const handleUpdateWater = useCallback(
    async (updates: { water_ml: number }) => {
      if (!entry?.id) return
      await supabase.from('daily_entries').update({ water_ml: updates.water_ml, updated_at: new Date().toISOString() }).eq('id', entry.id)
      refetch()
    },
    [entry?.id, refetch]
  )

  if (entryLoading && !entry) {
    return (
      <div className="home-page">
        <p className="empty-state">{ru.loading}</p>
      </div>
    )
  }

  const now = new Date()
  const todayIso = entry?.entry_date ?? now.toISOString().slice(0, 10)
  const weekDates = getWeekDates(todayIso)
  const goalMl = profile?.water_goal_ml ?? 2000
  const waterMl = entry?.water_ml ?? 0
  const hour = now.getHours()
  const isMorning = hour < 11

  // Day state from 5 pillars
  const waterDone = waterMl >= goalMl * 0.6
  const careDone = routineProgress.length > 0 && routineProgress.every((r) => r.total === 0 || r.completed >= r.total)
  const tasksDone = taskTotal === 0
  const outfitDone = !!todayOutfit
  const journalDone = !!(entry?.journal_text?.trim())
  const pillars = { waterDone, careDone, tasksDone, outfitDone, journalDone }
  const dayState = calcDayState(pillars)

  // Show recovery message only if this is a "new day after a gap"
  const showRecovery = !prevDayHadEntry && !isMorning

  function renderWidget(widgetId: WidgetId) {
    switch (widgetId) {
      case 'water':
        return (
          <WaterWidget
            className={`home-water-widget${waterDone ? ' widget--pillar-done' : ''}`}
            entry={entry}
            goalMl={goalMl}
            onAddWater={handleAddWater}
            onUpdateEntry={handleUpdateWater}
            disabled={!user}
            userId={user?.id ?? null}
            monthAnchorDate={entry?.entry_date ?? todayIso}
          />
        )
      case 'focus': {
        return (
          <div className={`dashboard-card home-focus-card${tasksDone ? ' widget--pillar-done' : ''}`}>
            <h3 className="home-canvas-widget-title">{ru.focus}</h3>
            {tasksLoading ? (
              <p className="ds-muted">{ru.loading}</p>
            ) : taskTotal === 0 ? (
              <p className="home-focus-stat">{ru.homeFocusNoOpenTasks}</p>
            ) : (
              <>
                <p className="home-focus-stat">
                  {taskTotal}
                  <span className="home-focus-total"> открыто</span>
                </p>
                <p className="ds-muted" style={{ fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {ru.homeTasksOpen}
                </p>
              </>
            )}
            <Link to="/today" className="home-canvas-widget-link" style={{ marginTop: 'auto', paddingTop: 8, display: 'block' }}>
              {ru.openToday}
            </Link>
          </div>
        )
      }
      case 'care': {
        const allCareDone = routineProgress.length > 0 && routineProgress.every((r) => r.total === 0 || r.completed >= r.total)
        const stepsLeft = routineProgress.reduce((acc, r) => acc + (r.total > 0 ? Math.max(0, r.total - r.completed) : 0), 0)
        return (
          <div className={`dashboard-card home-care-card${careDone ? ' widget--pillar-done' : ''}`}>
            <h3 className="home-canvas-widget-title">{ru.beautyRoutine}</h3>
            {routinesLoading ? (
              <p className="ds-muted">{ru.loading}</p>
            ) : !hasAnyRoutines ? (
              <p className="home-care-empty">{ru.homeCareEmpty}</p>
            ) : (
              <>
                {routineProgress.length === 0 ? (
                  <p className="home-care-empty home-care-empty--tight">{ru.homeCareNoScheduledToday}</p>
                ) : allCareDone ? (
                  <p className="home-care-all-done home-care-all-done--tight">{ru.homeCareAllDone}</p>
                ) : stepsLeft > 0 ? (
                  <p className="home-care-steps-left">
                    {ru.homeCareStepsLeft}: <strong>{stepsLeft}</strong>
                  </p>
                ) : null}
                {careMonth && (
                  <div className="home-care-routine-month">
                    <CareRoutineMonthMicro
                      monthLabel={careMonth.monthLabel}
                      today={careMonth.today}
                      dates={careMonth.dates}
                      firstDow={careMonth.firstDow}
                      morning={careMonth.morning}
                      evening={careMonth.evening}
                    />
                  </div>
                )}
              </>
            )}
            {user?.id && (
              <div className="home-care-vitamins">
                <VitaminMonthMicro userId={user.id} />
              </div>
            )}
            <Link to="/today" className="home-canvas-widget-link" style={{ marginTop: 'auto', paddingTop: 8, display: 'block' }}>
              {ru.openToday}
            </Link>
          </div>
        )
      }
      case 'outfit-info':
        return (
          <div className={`home-outfit-hero__body${outfitDone ? ' widget--pillar-done' : ''}`}>
            <p className="home-outfit-hero__label">{ru.homeOutfitTitle}</p>
            {outfitLoading ? (
              <p className="ds-muted">{ru.loading}</p>
            ) : todayOutfit ? (
              <>
                <p className="home-outfit-hero__name">{todayOutfit.name}</p>
                <div className="home-week-chips">
                  {weekDates.map((date) => {
                    const isSelected = date === todayIso
                    const isPlanned = weekPlannedDates.has(date)
                    return (
                      <Link
                        key={date}
                        to={`/wardrobe/planned?date=${date}`}
                        className={[
                          'home-week-chips__day',
                          isSelected && 'home-week-chips__day--active',
                          isPlanned && 'home-week-chips__day--planned',
                        ].filter(Boolean).join(' ')}
                        title={date}
                      >
                        {date.slice(8, 10)}
                      </Link>
                    )
                  })}
                </div>
                <div className="home-outfit-hero__cta">
                  <Link to="/wardrobe/outfits" className="dashboard-btn-primary">{ru.planYourLook}</Link>
                </div>
              </>
            ) : (
              <>
                <p className="home-outfit-empty">{ru.homeOutfitEmpty}</p>
                <div className="home-outfit-hero__cta">
                  <Link to="/wardrobe/outfits" className="dashboard-btn-primary">{ru.avatarPickOutfit}</Link>
                </div>
              </>
            )}
          </div>
        )
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveWidget(null)
    if (!over) return
    const widgetId = active.id as WidgetId
    const targetSlotId = over.id as string  // e.g. 'left-tl'
    const [targetSide, targetPos] = targetSlotId.split('-') as [Side, SlotPos]
    if (!targetSide || !targetPos) return
    const from = findWidgetSlot(widgetId)
    if (!from || (from.side === targetSide && from.pos === targetPos)) return
    const displacedWidget = layout[targetSide][targetPos]
    const newLayout = {
      left: { ...layout.left },
      right: { ...layout.right },
    }
    newLayout[targetSide][targetPos] = widgetId
    if (displacedWidget) {
      newLayout[from.side][from.pos] = displacedWidget
    } else {
      delete newLayout[from.side][from.pos]
    }
    updateLayout(newLayout)
  }

  return (
    <div className={`home-page home-page--state-${dayState}`}>
      <header className="home-topbar">
        <div className="home-topbar__left">
          <h1 className="ds-page-title">{getGreeting(profile?.display_name)}</h1>
          <div className="home-day-state">
            <span className={`home-day-state__label home-day-state__label--${dayState}`}>
              {DAY_STATE_LABELS[dayState]}
            </span>
            <span className="home-day-state__sub">{DAY_STATE_SUBS[dayState]}</span>
          </div>
          {showRecovery && (
            <p className="home-recovery-msg">{ru.recoveryBack}</p>
          )}
        </div>
        <div className="home-topbar__actions">
          <Link to="/today" className="ds-mood-pill">
            {entry?.mood ? (MOOD_LABELS[entry.mood] ?? entry.mood) : ru.moodPlaceholder}
          </Link>
          <Link to="/today" className="btn-ghost btn--sm">
            {ru.addNote}
          </Link>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) => setActiveWidget(active.id as WidgetId)}
        onDragEnd={handleDragEnd}
      >
        <div className="home-main-grid">
          <aside className="home-sidebar home-sidebar--left">
            {SLOT_POSITIONS.map(pos => {
              const slotId = `left-${pos}`
              const widgetId = layout.left[pos]
              return (
                <WidgetSlot key={slotId} slotId={slotId} empty={!widgetId} isDraggingAny={!!activeWidget}>
                  {widgetId && <DraggableWidget id={widgetId}>{renderWidget(widgetId)}</DraggableWidget>}
                </WidgetSlot>
              )
            })}
          </aside>

          <section className="home-center">
            <article className="home-outfit-hero" aria-label={ru.homeOutfitTitle}>
              <div className="home-outfit-hero__media">
                {outfitLoading ? (
                  <div className="home-outfit-hero__placeholder">{ru.loading}</div>
                ) : todayOutfit?.cover_photo_url ? (
                  <img src={todayOutfit.cover_photo_url} alt="" />
                ) : todayOutfit && todayOutfit.items.length > 0 ? (
                  <div className="home-canvas-avatar-board home-outfit-hero__board">
                    {OUTFIT_SLOT_TYPES.map((slot) => {
                      const row = todayOutfit.items.find((r) => r.slot_type === slot)
                      const item = row?.wardrobe_items
                      if (!item) return null
                      return (
                        <div key={slot} className={`home-canvas-board-item home-canvas-board-item--${slot}`}>
                          {item.photo_url ? (
                            <img src={item.photo_url} alt="" />
                          ) : (
                            <div className="home-canvas-board-placeholder home-outfit-hero__ph">
                              <Camera className="home-outfit-hero__cam" strokeWidth={1.5} aria-hidden />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : todayOutfit ? (
                  <div className="home-outfit-hero__placeholder home-outfit-hero__placeholder--name">
                    {todayOutfit.name}
                  </div>
                ) : (
                  <div className="home-outfit-hero__placeholder">
                    <Camera className="home-outfit-hero__cam" strokeWidth={1.5} aria-hidden />
                  </div>
                )}
                <div className="home-outfit-hero__gradient" aria-hidden />
              </div>
            </article>
          </section>

          <aside className="home-sidebar home-sidebar--right">
            {SLOT_POSITIONS.map(pos => {
              const slotId = `right-${pos}`
              const widgetId = layout.right[pos]
              return (
                <WidgetSlot key={slotId} slotId={slotId} empty={!widgetId} isDraggingAny={!!activeWidget}>
                  {widgetId && <DraggableWidget id={widgetId}>{renderWidget(widgetId)}</DraggableWidget>}
                </WidgetSlot>
              )
            })}
          </aside>
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeWidget && (
            <div className="widget-drag-overlay">
              {renderWidget(activeWidget)}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <footer className="home-bottombar">
        <div className="home-pillars" aria-label="Состояние дня">
          <span className={`home-pillar${waterDone ? ' home-pillar--done' : ''}`} title="Вода" />
          <span className={`home-pillar${careDone ? ' home-pillar--done' : ''}`} title="Уход" />
          <span className={`home-pillar${tasksDone ? ' home-pillar--done' : ''}`} title="Фокус" />
          <span className={`home-pillar${outfitDone ? ' home-pillar--done' : ''}`} title="Образ" />
          <span className={`home-pillar${journalDone ? ' home-pillar--done' : ''}`} title="Дневник" />
        </div>
        <time dateTime={now.toISOString()} className="home-bottombar__date">
          {formatDate(now)}
        </time>
      </footer>
    </div>
  )
}
