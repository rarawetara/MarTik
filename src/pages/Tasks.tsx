import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGetOrCreateToday } from '../hooks/useGetOrCreateToday'
import { useTaskTemplates } from '../hooks/useTaskTemplates'
import { useTaskCategories } from '../hooks/useTaskCategories'
import { TaskList } from '../components/TaskList'
import { supabase } from '../lib/supabase'
import { ru } from '../constants/ru'
import { formatCalendarDayTitle, toIsoDateString } from '../utils/dateFormat'
import type { DailyEntry, DailyTask, Profile } from '../lib/supabase'

export function Tasks() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const isToday = !dateParam || dateParam === toIsoDateString(new Date())
  const [selectedDate, setSelectedDate] = useState(() =>
    dateParam ? new Date(dateParam + 'T12:00:00') : new Date()
  )
  const [profile, setProfile] = useState<Profile | null>(null)
  const { entry: todayEntry, loading: todayLoading } = useGetOrCreateToday(
    user?.id,
    profile?.timezone
  )
  const [entry, setEntry] = useState<DailyEntry | null>(null)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loadingOtherDate, setLoadingOtherDate] = useState(false)
  const {
    templates,
    templatesTableMissing,
    addTemplate,
    deleteTemplate,
    toggleTemplate,
    applyTemplatesToEntry,
    carryOverFromPreviousDay,
  } = useTaskTemplates(user?.id)
  const { categories, addCategory, deleteCategory } = useTaskCategories(user?.id)

  const dateStr = toIsoDateString(selectedDate)

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
    }
  }, [isToday, todayEntry])

  useEffect(() => {
    if (!user?.id) return
    if (isToday && todayEntry) {
      setEntry(todayEntry)
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

  const fetchTasksForEntry = useCallback(async (entryId: string) => {
    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('daily_entry_id', entryId)
      .order('sort_order', { ascending: true })
    setTasks((data as DailyTask[]) ?? [])
  }, [])

  useEffect(() => {
    if (!entry?.id) return
    const run = async () => {
      await applyTemplatesToEntry(entry.id, selectedDate)
      await carryOverFromPreviousDay(entry.id, selectedDate)
      fetchTasksForEntry(entry.id)
    }
    run()
  }, [entry?.id, templates.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const goPrev = useCallback(() => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
    setSearchParams({ date: toIsoDateString(d) })
  }, [selectedDate, setSearchParams])

  const goNext = useCallback(() => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
    setSearchParams({ date: toIsoDateString(d) })
  }, [selectedDate, setSearchParams])

  const goToToday = useCallback(() => {
    const d = new Date()
    setSelectedDate(d)
    setSearchParams({})
  }, [setSearchParams])

  const handleAddTask = useCallback(
    async (title: string): Promise<string | undefined> => {
      if (!user?.id || !entry?.id) return undefined
      const { data } = await supabase
        .from('daily_tasks')
        .insert({ user_id: user.id, daily_entry_id: entry.id, title })
        .select('id')
        .single()
      fetchTasksForEntry(entry.id)
      return (data as { id: string } | null)?.id
    },
    [user?.id, entry?.id, fetchTasksForEntry]
  )

  const handleToggleTask = useCallback(
    async (taskId: string, completed: boolean) => {
      if (!entry?.id) return
      if (completed) {
        const task = tasks.find((t) => t.id === taskId)
        if (task?.template_id) {
          const tpl = templates.find((t) => t.id === task.template_id)
          if (tpl?.recurrence_type === 'persistent') {
            await toggleTemplate(tpl.id, false)
          }
        }
        await supabase.from('daily_tasks').delete().eq('id', taskId)
      } else {
        await supabase
          .from('daily_tasks')
          .update({ completed: false, updated_at: new Date().toISOString() })
          .eq('id', taskId)
      }
      fetchTasksForEntry(entry.id)
    },
    [entry?.id, fetchTasksForEntry, tasks, templates, toggleTemplate]
  )

  const handleRenameTask = useCallback(async (taskId: string, title: string) => {
    await supabase
      .from('daily_tasks')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', taskId)
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, title: title.trim() } : t)))
  }, [])

  const handleDeleteTask = useCallback(async (taskId: string) => {
    await supabase.from('daily_tasks').delete().eq('id', taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }, [])

  if (isToday && todayLoading && !entry) {
    return (
      <div className="page-today page-tasks">
        <p className="empty-state">{ru.loading}</p>
      </div>
    )
  }

  if (!isToday && (loadingOtherDate || !entry)) {
    return (
      <div className="page-today page-tasks">
        <header className="page-today__header page-today__header--row">
          <button type="button" className="page-today__nav-circle" onClick={goPrev} aria-label="Предыдущий день">
            <ChevronLeft size={22} strokeWidth={1.8} aria-hidden />
          </button>
          <h1 className="page-today__title">{formatCalendarDayTitle(selectedDate)}</h1>
          <div className="page-today__header-right">
            <button type="button" className="page-today__nav-circle" onClick={goNext} aria-label="Следующий день">
              <ChevronRight size={22} strokeWidth={1.8} aria-hidden />
            </button>
            <button type="button" onClick={goToToday} className="btn-primary btn--sm">
              {ru.today}
            </button>
          </div>
        </header>
        <p className="empty-state">{loadingOtherDate ? ru.loading : ru.noEntries}</p>
        <Link to="/today" className="link-text">
          {ru.tasksPageBackToToday}
        </Link>
      </div>
    )
  }

  return (
    <div className="page-today page-tasks">
      <header className="page-today__header page-today__header--row">
        <button type="button" className="page-today__nav-circle" onClick={goPrev} aria-label="Предыдущий день">
          <ChevronLeft size={22} strokeWidth={1.8} aria-hidden />
        </button>
        <h1 className="page-today__title">{formatCalendarDayTitle(selectedDate)}</h1>
        <div className="page-today__header-right">
          <button type="button" className="page-today__nav-circle" onClick={goNext} aria-label="Следующий день">
            <ChevronRight size={22} strokeWidth={1.8} aria-hidden />
          </button>
          <button type="button" onClick={goToToday} className="btn-primary btn--sm">
            {ru.today}
          </button>
        </div>
      </header>

      <p className="page-tasks__lede">{ru.tasksPageLede}</p>

      {templatesTableMissing && (
        <p className="page-tasks__hint text-muted text-muted--small">{ru.taskTemplatesMigrationHint}</p>
      )}

      <section className="page-tasks__section">
        <TaskList
          tasks={tasks}
          templates={templates}
          categories={categories}
          onAddTask={handleAddTask}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onRenameTask={handleRenameTask}
          onTaskUpdated={(id, patch) =>
            setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
          }
          onAddTemplate={templatesTableMissing ? undefined : addTemplate}
          onDeleteTemplate={templatesTableMissing ? undefined : deleteTemplate}
          onToggleTemplate={templatesTableMissing ? undefined : toggleTemplate}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          disabled={!user}
        />
      </section>

      <p className="page-footer-link page-tasks__footer">
        <Link to="/today" className="link-text">
          {ru.tasksPageBackToToday}
        </Link>
      </p>
    </div>
  )
}
