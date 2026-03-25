import { Link } from 'react-router-dom'
import { Camera, GripVertical } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGetOrCreateToday } from '../hooks/useGetOrCreateToday'
import { WaterWidget } from '../components/WaterWidget'
import { supabase } from '../lib/supabase'
import { ru } from '../constants/ru'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Profile, Outfit, OutfitItem, WardrobeItem, BeautyRoutine, BeautyRoutineStep, DailyTask } from '../lib/supabase'
import { OUTFIT_SLOT_TYPES } from '../lib/supabase'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  MouseSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useWidgetLayout, type Side, type SlotPos, type WidgetId, SLOT_POSITIONS } from '../hooks/useWidgetLayout'

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

type RoutineProgress = { name: string; completed: number; total: number }

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
  const [routinesLoading, setRoutinesLoading] = useState(false)
  const [taskTotal, setTaskTotal] = useState(0)
  const [taskCompleted, setTaskCompleted] = useState(0)
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
      const due = routines.filter((r) => isRoutineDue(r, entry.entry_date))
      const { data: logsData } = await supabase
        .from('beauty_logs')
        .select('routine_step_id')
        .eq('daily_entry_id', entry.id)
      const completedStepIds = new Set((logsData as { routine_step_id: string }[] ?? []).map((l) => l.routine_step_id))
      const progress: RoutineProgress[] = []
      for (const routine of due) {
        const { data: stepsData } = await supabase
          .from('beauty_routine_steps')
          .select('id')
          .eq('routine_id', routine.id)
          .is('deleted_at', null)
        const steps = (stepsData as BeautyRoutineStep[]) ?? []
        const completed = steps.filter((s) => completedStepIds.has(s.id)).length
        progress.push({ name: routine.name, completed, total: steps.length })
      }
      setRoutineProgress(progress)
      setRoutinesLoading(false)
    }
    load()
  }, [user?.id, entry?.id, entry?.entry_date])

  useEffect(() => {
    if (!entry?.id) {
      setTaskTotal(0)
      setTaskCompleted(0)
      setTasksLoading(false)
      return
    }
    setTasksLoading(true)
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await supabase
          .from('daily_tasks')
          .select('id, completed')
          .eq('daily_entry_id', entry.id)
        if (cancelled) return
        const tasks = (data as Pick<DailyTask, 'id' | 'completed'>[]) ?? []
        setTaskTotal(tasks.length)
        setTaskCompleted(tasks.filter((t) => t.completed).length)
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
  const tasksDone = taskTotal > 0 && taskCompleted >= taskTotal
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
          />
        )
      case 'focus': {
        const allTasksDone = taskTotal > 0 && taskCompleted >= taskTotal
        return (
          <div className={`dashboard-card home-focus-card${tasksDone ? ' widget--pillar-done' : ''}`}>
            <h3 className="home-canvas-widget-title">{ru.focus}</h3>
            {tasksLoading ? (
              <p className="ds-muted">{ru.loading}</p>
            ) : taskTotal === 0 ? (
              <p className="home-focus-empty">{ru.homeFocusEmpty}</p>
            ) : allTasksDone ? (
              <p className="home-focus-stat">{ru.homeFocusDone}</p>
            ) : (
              <>
                <p className="home-focus-stat">{taskCompleted}<span className="home-focus-total">/{taskTotal}</span></p>
                <p className="ds-muted" style={{ fontSize: 11, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{ru.homeTasksCompleted}</p>
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
        return (
          <div className={`dashboard-card home-care-card${careDone ? ' widget--pillar-done' : ''}`}>
            <h3 className="home-canvas-widget-title">{ru.beautyRoutine}</h3>
            {routinesLoading ? (
              <p className="ds-muted">{ru.loading}</p>
            ) : routineProgress.length === 0 ? (
              <p className="home-care-empty">{ru.homeCareEmpty}</p>
            ) : allCareDone ? (
              <p className="home-care-all-done">{ru.homeCareAllDone}</p>
            ) : (
              <ul className="home-care-list">
                {routineProgress.map((r) => {
                  const done = r.total > 0 && r.completed >= r.total
                  return (
                    <li key={r.name} className={`home-care-item${done ? ' home-care-item--done' : ' home-care-item--muted'}`}>
                      <span className="home-care-dot" aria-hidden />
                      <span>
                        {r.name}
                        {r.total > 0 && (
                          <span className="home-care-meta"> {r.completed}/{r.total}</span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
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
