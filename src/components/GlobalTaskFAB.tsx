import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckSquare, Plus, X, RotateCcw, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGetOrCreateToday } from '../hooks/useGetOrCreateToday'
import { useTaskTemplates } from '../hooks/useTaskTemplates'
import { supabase } from '../lib/supabase'
import type { DailyTask } from '../lib/supabase'

export function GlobalTaskFAB() {
  const { user } = useAuth()
  const { entry } = useGetOrCreateToday(user?.id)
  const { applyTemplatesToEntry } = useTaskTemplates(user?.id)

  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchTasks = useCallback(async (entryId: string) => {
    const { data } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('daily_entry_id', entryId)
      .order('sort_order', { ascending: true })
    setTasks((data as DailyTask[]) ?? [])
  }, [])

  // Load tasks when entry is ready
  useEffect(() => {
    if (!entry?.id) return
    applyTemplatesToEntry(entry.id, new Date()).then(() => fetchTasks(entry.id))
  }, [entry?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when panel opens
  useEffect(() => {
    if (open && entry?.id) fetchTasks(entry.id)
  }, [open, entry?.id, fetchTasks])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
  }, [open])

  // Close on ESC or outside click
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title || adding || !user?.id || !entry?.id) return
    setAdding(true)
    try {
      await supabase.from('daily_tasks').insert({
        user_id: user.id,
        daily_entry_id: entry.id,
        title,
        completed: false,
        sort_order: tasks.length,
        template_id: null,
      })
      setNewTitle('')
      await fetchTasks(entry.id)
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (task: DailyTask) => {
    if (!entry?.id) return
    await supabase
      .from('daily_tasks')
      .update({ completed: !task.completed, updated_at: new Date().toISOString() })
      .eq('id', task.id)
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: !t.completed } : t))
  }

  const handleDelete = async (taskId: string) => {
    await supabase.from('daily_tasks').delete().eq('id', taskId)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  if (!user) return null

  const done = tasks.filter((t) => t.completed).length
  const total = tasks.length

  return (
    <div className="global-task-fab" ref={panelRef}>
      {/* Mini panel */}
      {open && (
        <div className="global-task-panel">
          <header className="global-task-panel__header">
            <span className="global-task-panel__title">Задачи на сегодня</span>
            {total > 0 && (
              <span className="global-task-panel__count">{done}/{total}</span>
            )}
            <button
              type="button"
              className="global-task-panel__close"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </header>

          {/* Task list */}
          <div className="global-task-panel__body">
            {tasks.length === 0 ? (
              <p className="global-task-panel__empty">Задач нет — добавь первую</p>
            ) : (
              <ul className="global-task-panel__list">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className={`global-task-item${task.completed ? ' global-task-item--done' : ''}`}
                  >
                    <button
                      type="button"
                      className={`global-task-item__check${task.completed ? ' checked' : ''}`}
                      onClick={() => handleToggle(task)}
                      aria-label={task.completed ? 'Снять отметку' : 'Выполнено'}
                    />
                    <span className="global-task-item__title">
                      {task.title}
                      {task.template_id && (
                        <RotateCcw size={9} style={{ marginLeft: 4, color: 'var(--text-light)', verticalAlign: 'middle' }} />
                      )}
                    </span>
                    <button
                      type="button"
                      className="global-task-item__delete"
                      onClick={() => handleDelete(task.id)}
                      aria-label="Удалить"
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Add form */}
          <form onSubmit={handleAdd} className="global-task-panel__add">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Добавить задачу…"
              className="global-task-panel__input"
              disabled={adding}
            />
            <button
              type="submit"
              disabled={adding || !newTitle.trim()}
              className="global-task-panel__submit"
              aria-label="Добавить"
            >
              <Plus size={16} />
            </button>
          </form>
        </div>
      )}

      {/* FAB button */}
      <button
        type="button"
        className={`global-task-fab__btn${open ? ' global-task-fab__btn--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Задачи на сегодня"
        title="Задачи"
      >
        <CheckSquare size={20} strokeWidth={1.8} />
        {!open && total > 0 && done < total && (
          <span className="global-task-fab__badge">{total - done}</span>
        )}
      </button>
    </div>
  )
}
