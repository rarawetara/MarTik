import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGetOrCreateToday } from '../hooks/useGetOrCreateToday'
import { WaterWidget } from '../components/WaterWidget'
import { TaskList } from '../components/TaskList'
import { BeautyRoutineToday } from '../components/Beauty/BeautyRoutineToday'
import { supabase } from '../lib/supabase'
import { ru } from '../constants/ru'
import type { DailyEntry, DailyTask, Profile } from '../lib/supabase'

const MOOD_OPTIONS = [
  { value: 'calm', label: 'Спокойствие' },
  { value: 'energetic', label: 'Энергия' },
  { value: 'tired', label: 'Усталость' },
  { value: 'happy', label: 'Радость' },
  { value: 'sad', label: 'Грусть' },
  { value: 'neutral', label: 'Нейтрально' },
]

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

  const saveMood = useCallback(
    async (mood: string | null) => {
      if (!entry?.id) return
      setSavingMood(true)
      await supabase
        .from('daily_entries')
        .update({ mood, updated_at: new Date().toISOString() })
        .eq('id', entry.id)
      setSavingMood(false)
      setEntry((e) => (e ? { ...e, mood } : null))
      if (isToday) refetch()
    },
    [entry?.id, isToday, refetch]
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
      fetchTasksForEntry(entry.id)
    },
    [entry?.id, fetchTasksForEntry]
  )

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      await supabase.from('daily_tasks').delete().eq('id', taskId)
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
    },
    []
  )

  if (isToday && todayLoading && !entry) {
    return <p className="empty-state">{ru.loading}</p>
  }

  if (!isToday && (loadingOtherDate || !entry)) {
    return (
      <div className="card">
        <div className="date-nav">
          <button type="button" onClick={goPrev} className="btn-ghost">
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{formatDateLabel(selectedDate)}</h1>
          <button type="button" onClick={goNext} className="btn-ghost">
            →
          </button>
        </div>
        <p className="empty-state">{loadingOtherDate ? ru.loading : ru.noEntries}</p>
        <Link to="/diary">{ru.viewInDiary}</Link>
      </div>
    )
  }

  return (
    <>
      <div className="date-nav">
        <button type="button" onClick={goPrev} className="btn-ghost">
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: '1.25rem' }}>{formatDateLabel(selectedDate)}</h1>
        <button type="button" onClick={goNext} className="btn-ghost">
          →
        </button>
      </div>
      <button type="button" onClick={goToToday} className="btn-ghost" style={{ marginBottom: 16 }}>
        {ru.today}
      </button>

      <div className="card">
        <h3>{ru.journal}</h3>
        <textarea
          value={journalDraft}
          onChange={(e) => setJournalDraft(e.target.value)}
          onBlur={saveJournal}
          placeholder={ru.journalPlaceholder}
          disabled={!user}
          className="form-group"
          style={{ marginBottom: 0 }}
        />
        {savingJournal && <span style={{ fontSize: '0.75rem', color: '#666' }}>{ru.saved}</span>}
      </div>

      <div className="card">
        <h3>{ru.mood}</h3>
        <div className="mood-options">
          {MOOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => saveMood(entry?.mood === opt.value ? null : opt.value)}
              disabled={savingMood || !user}
              className={entry?.mood === opt.value ? 'selected' : ''}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <WaterWidget
        entry={entry}
        goalMl={profile?.water_goal_ml ?? 2000}
        onAddWater={() => {}}
        onUpdateEntry={handleUpdateWater}
        disabled={!user}
      />

      {entry && user && (
        <BeautyRoutineToday
          dailyEntryId={entry.id}
          userId={user.id}
          entryDate={dateStr}
          disabled={!user}
        />
      )}

      <TaskList
        tasks={tasks}
        onAddTask={handleAddTask}
        onToggleTask={handleToggleTask}
        onDeleteTask={handleDeleteTask}
        disabled={!user}
      />

      <p style={{ marginTop: 24, fontSize: '0.875rem' }}>
        <Link to="/diary">{ru.viewInDiary}</Link>
      </p>
    </>
  )
}
