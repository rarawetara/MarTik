import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, GripVertical } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuth } from '../hooks/useAuth'
import { useGetOrCreateToday } from '../hooks/useGetOrCreateToday'
import { useTaskTemplates } from '../hooks/useTaskTemplates'
import { WaterWidget } from '../components/WaterWidget'
import { TaskList } from '../components/TaskList'
import { BeautyRoutineToday } from '../components/Beauty/BeautyRoutineToday'
import { supabase } from '../lib/supabase'
import { ru } from '../constants/ru'
import type { DailyEntry, DailyTask, Profile } from '../lib/supabase'

type PanelId = 'water' | 'tasks' | 'beauty' | 'mood' | 'journal'

const DEFAULT_PANEL_ORDER: PanelId[] = ['water', 'tasks', 'beauty', 'mood', 'journal']
const PANEL_ORDER_KEY = 'today-panel-order'

function loadPanelOrder(): PanelId[] {
  try {
    const saved = localStorage.getItem(PANEL_ORDER_KEY)
    if (saved) {
      const parsed: PanelId[] = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length === DEFAULT_PANEL_ORDER.length) return parsed
    }
  } catch {}
  return DEFAULT_PANEL_ORDER
}

type SortablePanelProps = {
  id: PanelId
  className?: string
  children: React.ReactNode
}

function SortablePanel({ id, className, children }: SortablePanelProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
  }
  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`page-today__panel ${className ?? ''}`}
    >
      <button
        type="button"
        className="today-panel-drag-handle"
        {...attributes}
        {...listeners}
        aria-label="Перетащить блок"
        tabIndex={-1}
      >
        <GripVertical size={14} strokeWidth={1.8} />
      </button>
      {children}
    </section>
  )
}

const MOOD_OPTIONS = [
  { value: 'calm', label: 'Спокойствие' },
  { value: 'energetic', label: 'Энергия' },
  { value: 'tired', label: 'Усталость' },
  { value: 'happy', label: 'Радость' },
  { value: 'sad', label: 'Грусть' },
  { value: 'neutral', label: 'Нейтрально' },
]

const JOURNAL_PROMPTS = [
  'Что сегодня было сложнее, чем ожидалось?',
  'Что ты заметила сегодня в первый раз?',
  'Что хочется унести из сегодняшнего дня?',
  'Как сейчас ощущается тело?',
  'Что сегодня было достаточно хорошим?',
  'Один момент, который хочется запомнить.',
  'Что давало энергию — и что её забирало?',
  'Как выглядел идеальный момент сегодня?',
  'Что ты поняла сегодня о себе?',
  'Что осталось незавершённым — и это нормально.',
  'За что благодарна сегодняшнему дню?',
  'Что хотелось бы повторить завтра?',
]

function getDailyJournalPrompt(dateStr: string): string {
  const dayIndex = parseInt(dateStr.replace(/-/g, ''), 10) % JOURNAL_PROMPTS.length
  return JOURNAL_PROMPTS[Math.abs(dayIndex) % JOURNAL_PROMPTS.length]
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDateLabel(date: Date): string {
  const today = toDateString(new Date())
  const ds = toDateString(date)
  const dayMonth = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
  if (ds === today) return ru.dateTodayPrefix + dayMonth
  const weekdayDayMonth = date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
  return weekdayDayMonth.charAt(0).toUpperCase() + weekdayDayMonth.slice(1)
}

export function Today() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const isToday = !dateParam || dateParam === toDateString(new Date())
  const [selectedDate, setSelectedDate] = useState(() =>
    dateParam ? new Date(dateParam + 'T12:00:00') : new Date()
  )
  const [profile, setProfile] = useState<Profile | null>(null)
  const { entry: todayEntry, loading: todayLoading, refetch } = useGetOrCreateToday(
    user?.id,
    profile?.timezone
  )
  const [entry, setEntry] = useState<DailyEntry | null>(null)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [journalDraft, setJournalDraft] = useState('')
  const [savingJournal, setSavingJournal] = useState(false)
  const [savingMood, setSavingMood] = useState(false)
  const [loadingOtherDate, setLoadingOtherDate] = useState(false)
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(loadPanelOrder)
  const { templates, addTemplate, deleteTemplate, toggleTemplate, applyTemplatesToEntry } =
    useTaskTemplates(user?.id)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setPanelOrder((prev) => {
      const oldIndex = prev.indexOf(active.id as PanelId)
      const newIndex = prev.indexOf(over.id as PanelId)
      const next = arrayMove(prev, oldIndex, newIndex)
      localStorage.setItem(PANEL_ORDER_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const journalTextareaRef = useRef<HTMLTextAreaElement>(null)

  const dateStr = toDateString(selectedDate)

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
    if (isToday && todayEntry) {
      setEntry(todayEntry)
      setJournalDraft(todayEntry.journal_text ?? '')
    }
  }, [isToday, todayEntry])

  useEffect(() => {
    if (!user?.id) return
    if (isToday && todayEntry) {
      setEntry(todayEntry)
      setJournalDraft(todayEntry.journal_text ?? '')
      return
    }
    const loadOrCreate = async () => {
      setLoadingOtherDate(true)
      const { data: existing } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr)
        .maybeSingle()
      if (existing) {
        setEntry(existing as DailyEntry)
        setJournalDraft((existing as DailyEntry).journal_text ?? '')
        setLoadingOtherDate(false)
        return
      }
      const { data: inserted } = await supabase
        .from('daily_entries')
        .insert({ user_id: user.id, entry_date: dateStr })
        .select()
        .single()
      if (inserted) {
        setEntry(inserted as DailyEntry)
        setJournalDraft('')
      }
      setLoadingOtherDate(false)
    }
    loadOrCreate()
  }, [user?.id, isToday, dateStr, todayEntry])

  useEffect(() => {
    if (!entry?.id) {
      setTasks([])
      return
    }
    supabase
      .from('daily_tasks')
      .select('*')
      .eq('daily_entry_id', entry.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setTasks((data as DailyTask[]) ?? []))
  }, [entry?.id])

  const goPrev = useCallback(() => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
    setSearchParams({ date: toDateString(d) })
  }, [selectedDate, setSearchParams])

  const goNext = useCallback(() => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
    setSearchParams({ date: toDateString(d) })
  }, [selectedDate, setSearchParams])

  const goToToday = useCallback(() => {
    const d = new Date()
    setSelectedDate(d)
    setSearchParams({})
  }, [setSearchParams])

  const saveJournal = useCallback(async () => {
    if (!entry?.id) return
    setSavingJournal(true)
    await supabase
      .from('daily_entries')
      .update({ journal_text: journalDraft, updated_at: new Date().toISOString() })
      .eq('id', entry.id)
    setSavingJournal(false)
    if (isToday) refetch()
  }, [entry?.id, journalDraft, isToday, refetch])

  const toggleMood = useCallback(
    async (value: string) => {
      if (!entry?.id) return
      setSavingMood(true)
      const current = entry.mood ? entry.mood.split(',').filter(Boolean) : []
      const next = current.includes(value)
        ? current.filter((m) => m !== value)
        : [...current, value]
      const mood = next.length > 0 ? next.join(',') : null
      await supabase
        .from('daily_entries')
        .update({ mood, updated_at: new Date().toISOString() })
        .eq('id', entry.id)
      setSavingMood(false)
      setEntry((e) => (e ? { ...e, mood } : null))
      if (isToday) refetch()
    },
    [entry?.id, entry?.mood, isToday, refetch]
  )

  const handleUpdateWater = useCallback(
    async (updates: { water_ml: number }) => {
      if (!entry?.id) return
      await supabase
        .from('daily_entries')
        .update({ water_ml: updates.water_ml, updated_at: new Date().toISOString() })
        .eq('id', entry.id)
      if (isToday) refetch()
      else setEntry((e) => (e ? { ...e, water_ml: updates.water_ml } : null))
    },
    [entry?.id, isToday, refetch]
  )

  const fetchTasksForEntry = useCallback(async (entryId: string) => {
    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('daily_entry_id', entryId)
      .order('sort_order', { ascending: true })
    setTasks((data as DailyTask[]) ?? [])
  }, [])

  // Auto-apply recurring templates when entry is ready
  useEffect(() => {
    if (!entry?.id) return
    applyTemplatesToEntry(entry.id, selectedDate).then(() => fetchTasksForEntry(entry.id))
  }, [entry?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddTask = useCallback(
    async (title: string) => {
      if (!user?.id || !entry?.id) return
      await supabase.from('daily_tasks').insert({
        user_id: user.id,
        daily_entry_id: entry.id,
        title,
      })
      fetchTasksForEntry(entry.id)
    },
    [user?.id, entry?.id, fetchTasksForEntry]
  )

  const handleToggleTask = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!entry?.id) return
      await supabase
        .from('daily_tasks')
        .update({ completed, updated_at: new Date().toISOString() })
        .eq('id', taskId)
      // Deactivate persistent template when its task is completed
      if (completed) {
        const task = tasks.find((t) => t.id === taskId)
        if (task?.template_id) {
          const tpl = templates.find((t) => t.id === task.template_id)
          if (tpl?.recurrence_type === 'persistent') {
            await toggleTemplate(tpl.id, false)
          }
        }
      }
      fetchTasksForEntry(entry.id)
    },
    [entry?.id, fetchTasksForEntry, tasks, templates, toggleTemplate]
  )

  const handleRenameTask = useCallback(
    async (taskId: string, title: string) => {
      await supabase
        .from('daily_tasks')
        .update({ title: title.trim(), updated_at: new Date().toISOString() })
        .eq('id', taskId)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: title.trim() } : t)))
    },
    []
  )

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      await supabase.from('daily_tasks').delete().eq('id', taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    },
    []
  )

  if (isToday && todayLoading && !entry) {
    return (
      <div className="page-today">
        <p className="empty-state">{ru.loading}</p>
      </div>
    )
  }

  if (!isToday && (loadingOtherDate || !entry)) {
    return (
      <div className="page-today">
        <div className="card">
          <header className="page-today__header page-today__header--row">
            <button
              type="button"
              className="page-today__nav-circle"
              onClick={goPrev}
              aria-label="Предыдущий день"
            >
              <ChevronLeft size={22} strokeWidth={1.8} aria-hidden />
            </button>
            <h1 className="page-today__title">{formatDateLabel(selectedDate)}</h1>
            <div className="page-today__header-right">
              <button
                type="button"
                className="page-today__nav-circle"
                onClick={goNext}
                aria-label="Следующий день"
              >
                <ChevronRight size={22} strokeWidth={1.8} aria-hidden />
              </button>
              <button type="button" onClick={goToToday} className="btn-primary btn--sm">
                {ru.today}
              </button>
            </div>
          </header>
          <p className="empty-state">{loadingOtherDate ? ru.loading : ru.noEntries}</p>
          <Link to="/diary" className="link-text">
            {ru.viewInDiary}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-today">
      <header className="page-today__header page-today__header--row">
        <button
          type="button"
          className="page-today__nav-circle"
          onClick={goPrev}
          aria-label="Предыдущий день"
        >
          <ChevronLeft size={22} strokeWidth={1.8} aria-hidden />
        </button>
        <h1 className="page-today__title">{formatDateLabel(selectedDate)}</h1>
        <div className="page-today__header-right">
          <button
            type="button"
            className="page-today__nav-circle"
            onClick={goNext}
            aria-label="Следующий день"
          >
            <ChevronRight size={22} strokeWidth={1.8} aria-hidden />
          </button>
          <button type="button" onClick={goToToday} className="btn-primary btn--sm">
            {ru.today}
          </button>
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={panelOrder} strategy={verticalListSortingStrategy}>
          <div className="page-today__grid">
            {panelOrder.map((panelId) => {
              if (panelId === 'journal') return (
                <SortablePanel key="journal" id="journal" className="page-today__panel--journal card">
                  <h3 className="page-today__mood-title">{ru.journalShortLabel}</h3>
                  <textarea
                    ref={journalTextareaRef}
                    className="today-journal-textarea"
                    value={journalDraft}
                    onChange={(e) => setJournalDraft(e.target.value)}
                    onBlur={saveJournal}
                    placeholder={getDailyJournalPrompt(dateStr)}
                    disabled={!user}
                    rows={6}
                  />
                  <div className="today-journal-footer">
                    {savingJournal
                      ? <span className="text-muted text-muted--small">{ru.loading}</span>
                      : journalDraft.trim()
                        ? <span className="text-muted text-muted--small">{ru.feedbackJournal}</span>
                        : null
                    }
                  </div>
                </SortablePanel>
              )

              if (panelId === 'mood') {
                const activeMoods = entry?.mood ? entry.mood.split(',').filter(Boolean) : []
                return (
                  <SortablePanel key="mood" id="mood" className="page-today__panel--mood">
                    <div className="dashboard-card dashboard-card--mood">
                    <div className="page-today__mood-header">
                      <h3 className="dashboard-card-title">{ru.mood}</h3>
                      {activeMoods.length > 0 && (
                        <span className="page-today__mood-hint">ещё раз — снять</span>
                      )}
                    </div>
                    <div className="mood-options">
                      {MOOD_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleMood(opt.value)}
                          disabled={savingMood || !user}
                          className={activeMoods.includes(opt.value) ? 'selected' : ''}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    </div>
                  </SortablePanel>
                )
              }

              if (panelId === 'water') return (
                <SortablePanel key="water" id="water" className="page-today__panel--water">
                  <WaterWidget
                    entry={entry}
                    goalMl={profile?.water_goal_ml ?? 2000}
                    onAddWater={() => {}}
                    onUpdateEntry={handleUpdateWater}
                    disabled={!user}
                  />
                </SortablePanel>
              )

              if (panelId === 'beauty' && entry && user) return (
                <SortablePanel key="beauty" id="beauty" className="page-today__panel--beauty">
                  <BeautyRoutineToday
                    dailyEntryId={entry.id}
                    userId={user.id}
                    entryDate={dateStr}
                    disabled={!user}
                  />
                </SortablePanel>
              )

              if (panelId === 'beauty') return (
                <SortablePanel key="beauty" id="beauty" className="page-today__panel--beauty">
                  <p className="empty-state" style={{ margin: 0, padding: '12px 0' }}>{ru.loading}</p>
                </SortablePanel>
              )

              if (panelId === 'tasks') return (
                <SortablePanel key="tasks" id="tasks" className="page-today__panel--tasks">
                  <TaskList
                    tasks={tasks}
                    templates={templates}
                    onAddTask={handleAddTask}
                    onToggleTask={handleToggleTask}
                    onDeleteTask={handleDeleteTask}
                    onRenameTask={handleRenameTask}
                    onAddTemplate={addTemplate}
                    onDeleteTemplate={deleteTemplate}
                    onToggleTemplate={toggleTemplate}
                    disabled={!user}
                  />
                </SortablePanel>
              )

              return null
            })}
          </div>
        </SortableContext>
      </DndContext>

      {isToday && new Date().getHours() >= 19 && (
        <section className="page-today__evening-summary">
          <p className="page-today__evening-title">{ru.eveningSummaryTitle}</p>
          <p className="page-today__evening-sub">
            {entry?.mood
              ? `Настроение — ${entry.mood.split(',').map((m) =>
                  m === 'calm' ? 'спокойствие' : m === 'energetic' ? 'энергия' : m === 'tired' ? 'усталость' : m === 'happy' ? 'радость' : m === 'sad' ? 'грусть' : 'нейтрально'
                ).join(', ')}.`
              : ''
            }
            {' '}Хороший день.
          </p>
          <Link to="/diary" className="link-text">{ru.eveningSummaryLink}</Link>
        </section>
      )}

      <p className="page-footer-link page-today__footer">
        <Link to="/diary" className="link-text">
          {ru.viewInDiary}
        </Link>
      </p>
    </div>
  )
}
