import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckSquare, Plus, X, RotateCcw, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useGetOrCreateToday } from '../hooks/useGetOrCreateToday'
import { useTaskTemplates } from '../hooks/useTaskTemplates'
import { supabase } from '../lib/supabase'
import { capitalizeFirst, textInputLocaleProps } from '../lib/textInput'
import type { DailyTask } from '../lib/supabase'

export function GlobalTaskFAB() {
  const { user } = useAuth()
  const [profileTimezone, setProfileTimezone] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!user?.id) {
      setProfileTimezone(undefined)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('timezone')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled && data?.timezone) setProfileTimezone(data.timezone as string)
      })
    return () => { cancelled = true }
  }, [user?.id])

  const { entry, loading: entryLoading, refetch: refetchEntry } = useGetOrCreateToday(
    user?.id,
    profileTimezone
  )
  const { applyTemplatesToEntry, toggleTemplate, templates } = useTaskTemplates(user?.id)

  const [open, setOpen] = useState(false)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const fetchTasks = useCallback(async (entryId: string) => {
    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('daily_entry_id', entryId)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('GlobalTaskFAB fetchTasks:', error)
      return
    }
    setTasks((data as DailyTask[]) ?? [])
  }, [])

  // Load tasks when entry is ready (same calendar day as Today page when timezone is set)
  useEffect(() => {
    if (!entry?.id) return
    const run = async () => {
      await applyTemplatesToEntry(entry.id, new Date())
      await fetchTasks(entry.id)
    }
    run()
  }, [entry?.id, applyTemplatesToEntry, fetchTasks])

  useEffect(() => {
    if (open && entry?.id) fetchTasks(entry.id)
  }, [open, entry?.id, fetchTasks])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
  }, [open])

  useEffect(() => {
    if (open) setAddError(null)
  }, [open])

  // Outside click: use "click" so we don't interfere with form submit (mousedown ordering)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      const root = rootRef.current
      if (root && !root.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick, true)
    }
  }, [open])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = capitalizeFirst(newTitle.trim())
    if (!title || adding || !user?.id) return

    setAddError(null)

    let entryId = entry?.id
    if (!entryId) {
      const row = await refetchEntry()
      entryId = row?.id ?? undefined
    }
    if (!entryId) {
      setAddError('Не удалось загрузить день. Попробуй ещё раз.')
      return
    }

    setAdding(true)
    try {
      const { error, data } = await supabase
        .from('daily_tasks')
        .insert({
          user_id: user.id,
          daily_entry_id: entryId,
          title,
          completed: false,
          sort_order: tasks.length,
        })
        .select('*')
        .single()

      if (error) {
        console.error('GlobalTaskFAB insert:', error)
        setAddError(error.message || 'Не удалось сохранить задачу')
        return
      }

      setNewTitle('')
      if (data) {
        setTasks((prev) => [...prev, data as DailyTask])
      } else {
        await fetchTasks(entryId)
      }
    } finally {
      setAdding(false)
    }
  }

  const handleCompleteTask = async (task: DailyTask) => {
    if (!entry?.id || task.completed) return
    if (task.template_id) {
      const tpl = templates.find((t) => t.id === task.template_id)
      if (tpl?.recurrence_type === 'persistent') {
        await toggleTemplate(tpl.id, false)
      }
    }
    const { error } = await supabase.from('daily_tasks').delete().eq('id', task.id)
    if (error) {
      console.error('GlobalTaskFAB complete/delete:', error)
      return
    }
    setTasks((prev) => prev.filter((t) => t.id !== task.id))
  }

  const handleDelete = async (taskId: string) => {
    const { error } = await supabase.from('daily_tasks').delete().eq('id', taskId)
    if (error) {
      console.error('GlobalTaskFAB delete:', error)
      return
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  if (!user) return null

  const total = tasks.length
  const entryReady = !!entry?.id && !entryLoading

  return (
    <div className="global-task-fab" ref={rootRef}>
      {open && (
        <div className="global-task-panel">
          <header className="global-task-panel__header">
            <span className="global-task-panel__title">Задачи на сегодня</span>
            {total > 0 && <span className="global-task-panel__count">{total}</span>}
            <button
              type="button"
              className="global-task-panel__close"
              onClick={() => setOpen(false)}
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </header>

          {!entryReady && entryLoading && (
            <p className="global-task-panel__empty" style={{ padding: '12px 16px' }}>
              Загрузка дня…
            </p>
          )}

          {(!entryLoading && !entry?.id) && (
            <p className="global-task-panel__empty" style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
              Не удалось открыть запись дня. Обнови страницу или зайди на «Сегодня».
            </p>
          )}

          <div className="global-task-panel__body">
            {entryReady && tasks.length === 0 ? (
              <p className="global-task-panel__empty">Задач нет — добавь первую</p>
            ) : entryReady ? (
              <ul className="global-task-panel__list">
                {tasks.map((task) => (
                  <li key={task.id} className="global-task-item">
                    <button
                      type="button"
                      className="global-task-item__check"
                      onClick={() => handleCompleteTask(task)}
                      aria-label="Выполнено"
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
            ) : null}
          </div>

          <form onSubmit={handleAdd} className="global-task-panel__add">
            <input
              ref={inputRef}
              type="text"
              value={newTitle}
              onChange={(e) => {
                let v = e.target.value
                if (newTitle.length === 0 && v.length > 0) {
                  const first = v.trimStart()[0]
                  if (first && /[a-zа-яё]/i.test(first)) {
                    const i = v.indexOf(first)
                    v = v.slice(0, i) + first.toLocaleUpperCase('ru-RU') + v.slice(i + 1)
                  }
                }
                setNewTitle(v)
                setAddError(null)
              }}
              placeholder="Добавить задачу…"
              className="global-task-panel__input"
              disabled={adding || !entryReady}
              {...textInputLocaleProps}
            />
            <button
              type="submit"
              disabled={adding || !newTitle.trim() || !entryReady}
              className="global-task-panel__submit"
              aria-label="Добавить"
            >
              <Plus size={16} />
            </button>
          </form>
          {addError && (
            <p className="global-task-panel__error" style={{ margin: 0, padding: '8px 14px', fontSize: 13, color: 'var(--accent-dark)' }}>
              {addError}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        className={`global-task-fab__btn${open ? ' global-task-fab__btn--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-label="Задачи на сегодня"
        title="Задачи"
      >
        <CheckSquare size={20} strokeWidth={1.8} />
        {!open && total > 0 && <span className="global-task-fab__badge">{total}</span>}
      </button>
    </div>
  )
}
