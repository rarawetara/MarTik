import { useEffect, useRef, useState } from 'react'
import { Trash2, RepeatIcon, Pencil, Tag, Eye, EyeOff } from 'lucide-react'
import { ru } from '../constants/ru'
import { supabase } from '../lib/supabase'
import { capitalizeFirst, textInputLocaleProps } from '../lib/textInput'
import type { DailyTask, TaskCategory, TaskTemplate } from '../lib/supabase'

const DOW_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

const RECURRENCE_OPTIONS: { value: TaskTemplate['recurrence_type']; label: string }[] = [
  { value: 'daily',    label: 'Каждый день' },
  { value: 'weekdays', label: 'Будни (Пн–Пт)' },
  { value: 'weekends', label: 'Выходные (Сб–Вс)' },
  { value: 'weekly',   label: 'По дням недели' },
]

function recurrenceLabel(tpl: TaskTemplate): string {
  switch (tpl.recurrence_type) {
    case 'daily':    return 'Каждый день'
    case 'weekdays': return 'Пн–Пт'
    case 'weekends': return 'Сб–Вс'
    case 'weekly': {
      const days = (tpl.recurrence_days ?? []).map((d) => DOW_LABELS[d]).join(', ')
      return days || 'По неделям'
    }
    default: return ''
  }
}

type TaskListProps = {
  tasks: DailyTask[]
  templates?: TaskTemplate[]
  categories?: TaskCategory[]
  onAddTask: (title: string) => Promise<string | undefined> | Promise<void>
  onToggleTask: (taskId: string, completed: boolean) => void | Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  onRenameTask?: (taskId: string, title: string) => Promise<void>
  onTaskUpdated?: (taskId: string, patch: Partial<DailyTask>) => void
  onAddCategory?: (name: string) => Promise<void>
  onDeleteCategory?: (id: string) => Promise<void>
  onAddTemplate?: (title: string, type: TaskTemplate['recurrence_type'], days: number[] | null, category?: string | null) => Promise<void>
  onDeleteTemplate?: (id: string) => Promise<void>
  onToggleTemplate?: (id: string, active: boolean) => Promise<void>
  disabled?: boolean
}

export function TaskList({
  tasks,
  templates = [],
  categories = [],
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onRenameTask,
  onTaskUpdated,
  onAddCategory,
  onDeleteCategory,
  onAddTemplate,
  onDeleteTemplate,
  onToggleTemplate,
  disabled = false,
}: TaskListProps) {

  // ── Category filter & management ──────────────────────────────────────
  const [filterCat, setFilterCat] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [newCatValue, setNewCatValue] = useState('')
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const catInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (addingCat) catInputRef.current?.focus() }, [addingCat])

  const handleAddCat = async () => {
    const name = capitalizeFirst(newCatValue.trim())
    setAddingCat(false); setNewCatValue('')
    if (!name) return
    await onAddCategory?.(name)
  }

  const handleDeleteCat = async (id: string, name: string) => {
    setConfirmDeleteCat(null)
    if (filterCat === name) setFilterCat('')
    await onDeleteCategory?.(id)
  }

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => setConfirmDeleteCat(id), 500)
  }
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  // ── Add task form ──────────────────────────────────────────────────────
  const [newTitle, setNewTitle] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = capitalizeFirst(newTitle.trim())
    if (!title || adding) return
    setAdding(true)
    try {
      const taskId = await onAddTask(title)
      if (taskId && newCatName) {
        await supabase.from('daily_tasks').update({ category: newCatName }).eq('id', taskId)
      }
      setNewTitle(''); setNewCatName('')
    } finally { setAdding(false) }
  }

  // ── Inline edit ────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingCat, setEditingCat] = useState<string>('')
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editingId) editRef.current?.focus() }, [editingId])

  const openEdit = (task: DailyTask) => {
    setEditingId(task.id)
    setEditingTitle(task.title)
    setEditingCat(task.category ?? '')
  }

  const cancelEdit = () => setEditingId(null)

  const saveEdit = async () => {
    if (!editingId) return
    const title = capitalizeFirst(editingTitle.trim())
    if (!title) { setEditingId(null); return }

    const patch: Partial<DailyTask> = {}
    const originalTask = tasks.find((t) => t.id === editingId)

    if (title !== originalTask?.title) {
      await onRenameTask?.(editingId, title)
      patch.title = title
    }

    const newCat = editingCat || null
    if (newCat !== (originalTask?.category ?? null)) {
      await supabase
        .from('daily_tasks')
        .update({ category: newCat, updated_at: new Date().toISOString() })
        .eq('id', editingId)
      patch.category = newCat
    }

    if (Object.keys(patch).length > 0) {
      onTaskUpdated?.(editingId, patch)
    }

    setEditingId(null)
  }

  // ── Group by category ──────────────────────────────────────────────────
  const [groupByCat, setGroupByCat] = useState(false)

  const [hideCompleted, setHideCompleted] = useState(() => {
    try {
      return localStorage.getItem('tasklist-hide-completed') !== 'false'
    } catch {
      return true
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem('tasklist-hide-completed', hideCompleted ? 'true' : 'false')
    } catch {
      /* ignore */
    }
  }, [hideCompleted])

  // ── Templates panel ────────────────────────────────────────────────────
  const [showTemplates, setShowTemplates] = useState(false)
  const [tplTitle, setTplTitle] = useState('')
  const [tplType, setTplType] = useState<TaskTemplate['recurrence_type']>('daily')
  const [tplDays, setTplDays] = useState<number[]>([])
  const [tplCatName, setTplCatName] = useState('')
  const [addingTpl, setAddingTpl] = useState(false)
  const [tplFormOpen, setTplFormOpen] = useState(false)

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = capitalizeFirst(tplTitle.trim())
    if (!title || addingTpl || !onAddTemplate) return
    setAddingTpl(true)
    try {
      await onAddTemplate(title, tplType, tplType === 'weekly' ? tplDays : null, tplCatName || null)
      setTplTitle(''); setTplType('daily'); setTplDays([]); setTplCatName(''); setTplFormOpen(false)
    } finally { setAddingTpl(false) }
  }

  const toggleDay = (d: number) =>
    setTplDays((p) => p.includes(d) ? p.filter((x) => x !== d) : [...p, d])

  // ── Derived ────────────────────────────────────────────────────────────
  const filteredByCat = filterCat ? tasks.filter((t) => t.category === filterCat) : tasks
  const displayTasks = hideCompleted ? filteredByCat.filter((t) => !t.completed) : filteredByCat
  const hasHiddenCompleted = hideCompleted && filteredByCat.some((t) => t.completed)
  const catNames = categories.map((c) => c.name)
  const repeatTemplates = templates.filter((t) => t.recurrence_type !== 'persistent')

  // ── Task row renderer ──────────────────────────────────────────────────
  const renderTask = (task: DailyTask) => {
    const isEditing = editingId === task.id
    return (
      <li key={task.id} className={`task-item${task.completed ? ' done' : ''}${isEditing ? ' task-item--editing' : ''}`}>
        {!isEditing && (
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggleTask(task.id, !task.completed)}
            disabled={disabled}
            aria-label={task.title}
          />
        )}

        {isEditing ? (
          <div className="task-item__edit-row">
            <input
              ref={editRef}
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit() }}
              className="task-item__edit-input"
              placeholder="Название задачи"
              disabled={disabled}
              {...textInputLocaleProps}
            />
            <select
              className="task-item__edit-cat"
              value={editingCat}
              onChange={(e) => setEditingCat(e.target.value)}
              disabled={disabled}
            >
              <option value="">Без категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <div className="task-item__edit-actions">
              <button type="button" className="btn-primary btn--sm" onClick={saveEdit} disabled={disabled}>
                Сохранить
              </button>
              <button type="button" className="btn-ghost btn--sm" onClick={cancelEdit}>
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <span className="task-item__title">
            {task.title}
            {task.category && <span className="task-item__cat-badge">{task.category}</span>}
          </span>
        )}

        {!isEditing && !task.completed && onRenameTask && (
          <button type="button" className="task-item__edit-btn"
            onClick={() => openEdit(task)}
            disabled={disabled} aria-label="Редактировать">
            <Pencil size={11} />
          </button>
        )}
        {!isEditing && (
          <button type="button" className="catalog-card__btn catalog-card__btn--delete task-item__delete"
            onClick={() => onDeleteTask(task.id)} disabled={disabled} aria-label={ru.delete}>
            <Trash2 size={12} />
          </button>
        )}
      </li>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-card task-list-card">

      {/* Header */}
      <div className="tl-header">
        <h3 className="dashboard-card-title">{ru.tasks}</h3>
        {tasks.length > 0 && (
          <span className="tl-progress">
            {tasks.filter((t) => t.completed).length}/{tasks.length}
          </span>
        )}
        <div className="tl-header-actions">
          <button
            type="button"
            className={`catalog-card__btn${hideCompleted ? ' catalog-card__btn--active' : ''}`}
            onClick={() => setHideCompleted((v) => !v)}
            title={hideCompleted ? ru.tasksShowCompletedTitle : ru.tasksHideCompletedTitle}
            aria-pressed={hideCompleted}
          >
            {hideCompleted ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          {categories.length > 0 && (
            <button type="button"
              className={`catalog-card__btn${groupByCat ? ' catalog-card__btn--active' : ''}`}
              onClick={() => setGroupByCat((v) => !v)}
              title="Группировать по категориям">
              <Tag size={13} />
            </button>
          )}
          {onAddTemplate && (
            <button type="button" className="catalog-card__btn"
              onClick={() => setShowTemplates((v) => !v)}
              title="Повторяющиеся задачи">
              <RepeatIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      <div className="tl-cats">
        <button type="button" className={`tl-cat-pill${!filterCat ? ' tl-cat-pill--active' : ''}`} onClick={() => setFilterCat('')}>
          Все
        </button>
        {categories.map((cat) => (
          <div key={cat.id} className="tl-cat-pill-wrap">
            {confirmDeleteCat === cat.id ? (
              <span className="tl-cat-confirm">
                Удалить?{' '}
                <button type="button" className="tl-cat-confirm__btn" onClick={() => handleDeleteCat(cat.id, cat.name)}>да</button>
                {' / '}
                <button type="button" className="tl-cat-confirm__btn" onClick={() => setConfirmDeleteCat(null)}>нет</button>
              </span>
            ) : (
              <button
                type="button"
                className={`tl-cat-pill${filterCat === cat.name ? ' tl-cat-pill--active' : ''}`}
                onClick={() => setFilterCat((v) => v === cat.name ? '' : cat.name)}
                onMouseDown={() => startLongPress(cat.id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(cat.id)}
                onTouchEnd={cancelLongPress}
              >
                {cat.name}
              </button>
            )}
          </div>
        ))}
        {onAddCategory && (
          addingCat ? (
            <input
              ref={catInputRef}
              type="text"
              value={newCatValue}
              onChange={(e) => setNewCatValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCat(); if (e.key === 'Escape') { setAddingCat(false); setNewCatValue('') } }}
              onBlur={handleAddCat}
              placeholder="Новая категория"
              className="tl-cat-input"
              {...textInputLocaleProps}
            />
          ) : (
            <button type="button" className="tl-cat-add-btn" onClick={() => setAddingCat(true)} aria-label="Добавить категорию">+</button>
          )
        )}
      </div>

      {/* Add task form */}
      <form onSubmit={handleAdd} className="tl-add-form">
        <div className="tl-add-form__row">
          <input
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
            }}
            placeholder={ru.taskPlaceholder}
            disabled={disabled}
            className="task-list-add__input"
            {...textInputLocaleProps}
          />
          {catNames.length > 0 && (
            <select className="tl-add-cat-select" value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)} disabled={disabled}>
              <option value="">Без категории</option>
              {catNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <button type="submit" disabled={adding || disabled} className="btn-primary btn--sm">{ru.addTask}</button>
        </div>
      </form>

      {/* Task list */}
      {displayTasks.length === 0 ? (
        <p className="empty-state" style={{ margin: '8px 0 0' }}>
          {hasHiddenCompleted
            ? ru.tasksCompletedHiddenHint
            : filterCat
              ? 'Нет задач в этой категории'
              : ru.noTasks}
        </p>
      ) : groupByCat ? (
        <div className="tl-groups">
          {(() => {
            const NO_CAT = '__none__'
            const groups: Record<string, typeof displayTasks> = {}
            displayTasks.forEach((task) => {
              const key = task.category || NO_CAT
              if (!groups[key]) groups[key] = []
              groups[key].push(task)
            })
            const orderedKeys: string[] = []
            categories.forEach((cat) => { if (groups[cat.name]) orderedKeys.push(cat.name) })
            if (groups[NO_CAT]) orderedKeys.push(NO_CAT)
            return orderedKeys.map((key) => (
              <div key={key} className="tl-group">
                <div className="tl-group-header">{key === NO_CAT ? 'Без категории' : key}</div>
                <ul className="task-list">{groups[key].map(renderTask)}</ul>
              </div>
            ))
          })()}
        </div>
      ) : (
        <ul className="task-list">{displayTasks.map(renderTask)}</ul>
      )}

      {/* Templates panel */}
      {showTemplates && onAddTemplate && (
        <div className="task-templates-panel">
          {repeatTemplates.length > 0 && (
            <ul className="task-templates-list">
              {repeatTemplates.map((tpl) => (
                <li key={tpl.id} className="task-template-item">
                  <button type="button" className={`task-template-item__toggle${tpl.is_active ? ' active' : ''}`}
                    onClick={() => onToggleTemplate?.(tpl.id, !tpl.is_active)} />
                  <span className="task-template-item__title">{tpl.title}</span>
                  {tpl.category && <span className="task-item__cat-badge">{tpl.category}</span>}
                  <span className="task-template-item__freq">{recurrenceLabel(tpl)}</span>
                  <button type="button" className="catalog-card__btn catalog-card__btn--delete"
                    onClick={() => onDeleteTemplate?.(tpl.id)} aria-label="Удалить">
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!tplFormOpen ? (
            <button type="button" className="task-templates-panel__add-btn" onClick={() => setTplFormOpen(true)}>
              + Добавить шаблон
            </button>
          ) : (
            <form onSubmit={handleAddTemplate} className="task-template-form">
              <input
                type="text"
                value={tplTitle}
                onChange={(e) => {
                  let v = e.target.value
                  if (tplTitle.length === 0 && v.length > 0) {
                    const first = v.trimStart()[0]
                    if (first && /[a-zа-яё]/i.test(first)) {
                      const i = v.indexOf(first)
                      v = v.slice(0, i) + first.toLocaleUpperCase('ru-RU') + v.slice(i + 1)
                    }
                  }
                  setTplTitle(v)
                }}
                placeholder="Название задачи"
                className="task-list-add__input"
                required
                {...textInputLocaleProps}
              />
              <select className="catalog-select" value={tplType}
                onChange={(e) => setTplType(e.target.value as TaskTemplate['recurrence_type'])}>
                {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {tplType === 'weekly' && (
                <div className="task-template-days">
                  {DOW_LABELS.map((label, i) => (
                    <button key={i} type="button"
                      className={`task-template-day${tplDays.includes(i) ? ' active' : ''}`}
                      onClick={() => toggleDay(i)}>{label}</button>
                  ))}
                </div>
              )}
              {catNames.length > 0 && (
                <select className="catalog-select" value={tplCatName} onChange={(e) => setTplCatName(e.target.value)}>
                  <option value="">— без категории —</option>
                  {catNames.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={addingTpl} className="btn-primary btn--sm">Создать</button>
                <button type="button" className="btn-ghost" onClick={() => setTplFormOpen(false)}>Отмена</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
