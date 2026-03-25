import { useEffect, useRef, useState } from 'react'
import { Trash2, RotateCcw, Plus, RepeatIcon, Pencil, Tag } from 'lucide-react'
import { ru } from '../constants/ru'
import type { DailyTask, TaskTemplate } from '../lib/supabase'

const DOW_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

const RECURRENCE_OPTIONS: { value: TaskTemplate['recurrence_type']; label: string }[] = [
  { value: 'daily',      label: 'Каждый день' },
  { value: 'weekdays',   label: 'Будни (Пн–Пт)' },
  { value: 'weekends',   label: 'Выходные (Сб–Вс)' },
  { value: 'weekly',     label: 'По дням недели' },
  { value: 'persistent', label: 'До выполнения' },
]

function recurrenceLabel(tpl: TaskTemplate): string {
  switch (tpl.recurrence_type) {
    case 'daily':      return 'Каждый день'
    case 'weekdays':   return 'Пн–Пт'
    case 'weekends':   return 'Сб–Вс'
    case 'persistent': return 'До выполнения'
    case 'weekly': {
      const days = (tpl.recurrence_days ?? [])
        .map((d) => ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][d])
        .join(', ')
      return days || 'По неделям'
    }
    default: return ''
  }
}

// Categories stored in localStorage
function loadCategories(): string[] {
  try { return JSON.parse(localStorage.getItem('task_categories') ?? '[]') } catch { return [] }
}
function saveCategoryMap(map: Record<string, string>) {
  localStorage.setItem('task_cat_map', JSON.stringify(map))
}
function loadCategoryMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem('task_cat_map') ?? '{}') } catch { return {} }
}

type TaskListProps = {
  tasks: DailyTask[]
  templates?: TaskTemplate[]
  onAddTask: (title: string) => Promise<void>
  onToggleTask: (taskId: string, completed: boolean) => void | Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  onRenameTask?: (taskId: string, title: string) => Promise<void>
  onAddTemplate?: (title: string, type: TaskTemplate['recurrence_type'], days: number[] | null, category?: string | null) => Promise<void>
  onDeleteTemplate?: (id: string) => Promise<void>
  onToggleTemplate?: (id: string, active: boolean) => Promise<void>
  disabled?: boolean
}

export function TaskList({
  tasks,
  templates = [],
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onRenameTask,
  onAddTemplate,
  onDeleteTemplate,
  onToggleTemplate,
  disabled = false,
}: TaskListProps) {
  // ── Categories ─────────────────────────────────────────
  const [categories, setCategories] = useState<string[]>(loadCategories)
  const [catMap, setCatMap] = useState<Record<string, string>>(loadCategoryMap)
  const [showCatMgr, setShowCatMgr] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')

  useEffect(() => {
    localStorage.setItem('task_categories', JSON.stringify(categories))
  }, [categories])
  useEffect(() => { saveCategoryMap(catMap) }, [catMap])

  const addCategory = (name: string) => {
    const n = name.trim()
    if (!n || categories.includes(n)) return
    setCategories((p) => [...p, n])
    setNewCatInput('')
  }
  const removeCategory = (name: string) => {
    setCategories((p) => p.filter((c) => c !== name))
    setCatMap((m) => {
      const next = { ...m }
      Object.keys(next).forEach((k) => { if (next[k] === name) delete next[k] })
      return next
    })
  }

  // ── Filter ─────────────────────────────────────────────
  const [filterCat, setFilterCat] = useState('')

  // ── Inline edit ────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const editRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && editRef.current) editRef.current.focus()
  }, [editingId])

  const startEdit = (task: DailyTask) => {
    setEditingId(task.id)
    setEditingTitle(task.title)
  }

  const saveEdit = async () => {
    if (!editingId || !editingTitle.trim()) { setEditingId(null); return }
    await onRenameTask?.(editingId, editingTitle)
    setEditingId(null)
  }

  // ── Add task ───────────────────────────────────────────
  const [newTitle, setNewTitle] = useState('')
  const [newCat, setNewCat] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title || adding) return
    setAdding(true)
    try {
      await onAddTask(title)
      // assign category after getting the newly created task id
      // (simplification: we can't easily get the id here, skip cat assignment on add for now)
      setNewTitle('')
    } finally { setAdding(false) }
  }

  // ── Templates panel ────────────────────────────────────
  const [showTemplates, setShowTemplates] = useState(false)
  const [tplTitle, setTplTitle] = useState('')
  const [tplType, setTplType] = useState<TaskTemplate['recurrence_type']>('daily')
  const [tplDays, setTplDays] = useState<number[]>([])
  const [tplCat, setTplCat] = useState('')
  const [addingTpl, setAddingTpl] = useState(false)
  const [tplFormOpen, setTplFormOpen] = useState(false)

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = tplTitle.trim()
    if (!title || addingTpl || !onAddTemplate) return
    setAddingTpl(true)
    try {
      await onAddTemplate(title, tplType, tplType === 'weekly' ? tplDays : null, tplCat || null)
      setTplTitle(''); setTplType('daily'); setTplDays([]); setTplCat(''); setTplFormOpen(false)
    } finally { setAddingTpl(false) }
  }

  const toggleDay = (d: number) =>
    setTplDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])

  // ── Derived ────────────────────────────────────────────
  const filteredTasks = filterCat
    ? tasks.filter((t) => catMap[t.id] === filterCat)
    : tasks

  const persistentTemplates = templates.filter((t) => t.recurrence_type === 'persistent')
  const repeatTemplates = templates.filter((t) => t.recurrence_type !== 'persistent')

  return (
    <div className="dashboard-card task-list-card">
      {/* Header */}
      <div className="task-list-header">
        <h3 className="dashboard-card-title" style={{ marginBottom: 0 }}>{ru.tasks}</h3>
        <div className="task-list-header__actions">
          {categories.length > 0 && (
            <button type="button" className="catalog-card__btn" onClick={() => setShowCatMgr((v) => !v)} title="Категории">
              <Tag size={14} />
            </button>
          )}
          {onAddTemplate && (
            <button type="button" className="catalog-card__btn" onClick={() => setShowTemplates((v) => !v)} title="Повторяющиеся задачи">
              <RepeatIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="task-cat-filter">
          <button
            type="button"
            className={`task-cat-pill${!filterCat ? ' active' : ''}`}
            onClick={() => setFilterCat('')}
          >
            Все
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`task-cat-pill${filterCat === cat ? ' active' : ''}`}
              onClick={() => setFilterCat((v) => v === cat ? '' : cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Category manager */}
      {showCatMgr && (
        <div className="task-cat-mgr">
          <div className="task-cat-mgr__list">
            {categories.map((cat) => (
              <span key={cat} className="task-cat-mgr__item">
                {cat}
                <button type="button" onClick={() => removeCategory(cat)} className="task-cat-mgr__remove" aria-label="Удалить">✕</button>
              </span>
            ))}
          </div>
          <form className="task-cat-mgr__add" onSubmit={(e) => { e.preventDefault(); addCategory(newCatInput) }}>
            <input
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              placeholder="Новая категория..."
              className="task-list-add__input"
            />
            <button type="submit" className="btn-primary btn--sm">+</button>
          </form>
        </div>
      )}

      {/* Add task form */}
      <form onSubmit={handleAdd} className="task-list-add">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={ru.taskPlaceholder}
          disabled={disabled}
          className="task-list-add__input"
        />
        {categories.length > 0 && (
          <select
            className="catalog-select task-list-add__cat"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            disabled={disabled}
          >
            <option value="">—</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <button type="submit" disabled={adding || disabled} className="btn-primary">
          {ru.addTask}
        </button>
      </form>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <p className="empty-state" style={{ margin: '8px 0 0' }}>{filterCat ? 'Нет задач в этой категории' : ru.noTasks}</p>
      ) : (
        <ul className="task-list">
          {filteredTasks.map((task) => (
            <li key={task.id} className={`task-item${task.completed ? ' done' : ''}`}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggleTask(task.id, !task.completed)}
                disabled={disabled}
                aria-label={task.title}
              />
              {editingId === task.id ? (
                <input
                  ref={editRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={saveEdit}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                  className="task-item__edit-input"
                  disabled={disabled}
                />
              ) : (
                <span className="task-item__title">
                  {task.title}
                  {task.template_id && (
                    <RotateCcw size={10} style={{ color: 'var(--text-light)', flexShrink: 0, marginLeft: 3 }} />
                  )}
                  {catMap[task.id] && (
                    <span className="task-item__cat-badge">{catMap[task.id]}</span>
                  )}
                </span>
              )}
              {!task.completed && onRenameTask && editingId !== task.id && (
                <button
                  type="button"
                  className="task-item__edit-btn"
                  onClick={() => startEdit(task)}
                  disabled={disabled}
                  aria-label="Редактировать"
                >
                  <Pencil size={11} />
                </button>
              )}
              {categories.length > 0 && editingId !== task.id && (
                <select
                  className="task-item__cat-select"
                  value={catMap[task.id] ?? ''}
                  onChange={(e) => setCatMap((m) => ({ ...m, [task.id]: e.target.value }))}
                  disabled={disabled}
                >
                  <option value="">—</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              <button
                type="button"
                className="catalog-card__btn catalog-card__btn--delete task-item__delete"
                onClick={() => onDeleteTask(task.id)}
                disabled={disabled}
                aria-label={ru.delete}
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Templates panel */}
      {showTemplates && onAddTemplate && (
        <div className="task-templates-panel">

          {/* Persistent = "задачи на будущее" */}
          {persistentTemplates.length > 0 && (
            <>
              <p className="task-templates-panel__label">Задачи на будущее</p>
              <ul className="task-templates-list">
                {persistentTemplates.map((tpl) => (
                  <li key={tpl.id} className="task-template-item">
                    <button
                      type="button"
                      className={`task-template-item__toggle${tpl.is_active ? ' active' : ''}`}
                      onClick={() => onToggleTemplate?.(tpl.id, !tpl.is_active)}
                      title={tpl.is_active ? 'Отключить' : 'Включить'}
                    />
                    <span className="task-template-item__title">{tpl.title}</span>
                    {tpl.category && <span className="task-item__cat-badge">{tpl.category}</span>}
                    <span className="task-template-item__freq">до выполнения</span>
                    <button type="button" className="catalog-card__btn catalog-card__btn--delete" onClick={() => onDeleteTemplate?.(tpl.id)} aria-label="Удалить"><Trash2 size={12} /></button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Regular repeating */}
          {repeatTemplates.length > 0 && (
            <>
              <p className="task-templates-panel__label">Повторяющиеся</p>
              <ul className="task-templates-list">
                {repeatTemplates.map((tpl) => (
                  <li key={tpl.id} className="task-template-item">
                    <button
                      type="button"
                      className={`task-template-item__toggle${tpl.is_active ? ' active' : ''}`}
                      onClick={() => onToggleTemplate?.(tpl.id, !tpl.is_active)}
                      title={tpl.is_active ? 'Отключить' : 'Включить'}
                    />
                    <span className="task-template-item__title">{tpl.title}</span>
                    {tpl.category && <span className="task-item__cat-badge">{tpl.category}</span>}
                    <span className="task-template-item__freq">{recurrenceLabel(tpl)}</span>
                    <button type="button" className="catalog-card__btn catalog-card__btn--delete" onClick={() => onDeleteTemplate?.(tpl.id)} aria-label="Удалить"><Trash2 size={12} /></button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Add template form */}
          {!tplFormOpen ? (
            <button type="button" className="task-templates-panel__add-btn" onClick={() => setTplFormOpen(true)}>
              <Plus size={12} /> Добавить
            </button>
          ) : (
            <form onSubmit={handleAddTemplate} className="task-template-form">
              <input
                type="text"
                value={tplTitle}
                onChange={(e) => setTplTitle(e.target.value)}
                placeholder="Название задачи"
                className="task-list-add__input"
                required
              />
              <select
                className="catalog-select"
                value={tplType}
                onChange={(e) => setTplType(e.target.value as TaskTemplate['recurrence_type'])}
              >
                {RECURRENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {tplType === 'weekly' && (
                <div className="task-template-days">
                  {DOW_LABELS.map((label, i) => (
                    <button key={i} type="button" className={`task-template-day${tplDays.includes(i) ? ' active' : ''}`} onClick={() => toggleDay(i)}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {categories.length > 0 && (
                <select className="catalog-select" value={tplCat} onChange={(e) => setTplCat(e.target.value)}>
                  <option value="">— без категории —</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
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
