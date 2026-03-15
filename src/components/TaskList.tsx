import { useState } from 'react'
import { ru } from '../constants/ru'
import type { DailyTask } from '../lib/supabase'

type TaskListProps = {
  tasks: DailyTask[]
  onAddTask: (title: string) => Promise<void>
  onToggleTask: (taskId: string, completed: boolean) => void | Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  disabled?: boolean
}

export function TaskList({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  disabled = false,
}: TaskListProps) {
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title || adding) return
    setAdding(true)
    try {
      await onAddTask(title)
      setNewTitle('')
    } finally {
      setAdding(false)
    }
  }

  const toggle = (task: DailyTask) => {
    onToggleTask(task.id, !task.completed)
  }

  return (
    <div className="card">
      <h3>{ru.tasks}</h3>
      <form onSubmit={handleAdd} style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={ru.taskPlaceholder}
            disabled={disabled}
            className="form-group"
            style={{ flex: 1, marginBottom: 0 }}
          />
          <button type="submit" disabled={adding || disabled} className="btn-primary">
            {ru.addTask}
          </button>
        </div>
      </form>
      {tasks.length === 0 ? (
        <p className="empty-state">{ru.noTasks}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {tasks.map((task) => (
            <li key={task.id} className={`task-item ${task.completed ? 'done' : ''}`}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggle(task)}
                disabled={disabled}
                aria-label={task.title}
              />
              <span style={{ textDecoration: task.completed ? 'line-through' : undefined }}>
                {task.title}
              </span>
              <button
                type="button"
                onClick={() => onDeleteTask(task.id)}
                disabled={disabled}
                className="btn-ghost"
                style={{ padding: '4px 8px', fontSize: '0.875rem' }}
              >
                {ru.delete}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
