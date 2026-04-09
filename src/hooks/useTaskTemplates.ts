import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  clearTemplatesMissingFromStorage,
  isMissingTableError,
  persistTemplatesMissingToStorage,
  readTemplatesMissingFromStorage,
} from '../lib/supabaseErrors'
import type { DailyTask, TaskTemplate } from '../lib/supabase'

const taskTemplatesDisabled =
  typeof import.meta !== 'undefined' && import.meta.env.VITE_TASK_TEMPLATES_DISABLED === 'true'

/** One in-flight GET per user — avoids duplicate 404s (React Strict Mode, multiple hook instances). */
const taskTemplatesInflight = new Map<string, Promise<{ data: unknown; error: unknown }>>()

function queryTaskTemplatesOnce(userId: string): Promise<{ data: unknown; error: unknown }> {
  const existing = taskTemplatesInflight.get(userId)
  if (existing) return existing

  const promise = Promise.resolve(
    supabase
      .from('task_templates')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
  ).then((r) => r as { data: unknown; error: unknown })

  taskTemplatesInflight.set(userId, promise)
  promise.finally(() => {
    taskTemplatesInflight.delete(userId)
  })
  return promise
}

// Check if a template applies to a given date
export function templateMatchesDate(template: TaskTemplate, date: Date): boolean {
  if (!template.is_active) return false
  const dow = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

  switch (template.recurrence_type) {
    case 'daily':
    case 'persistent': // appears every day until completed (then template is deactivated)
      return true
    case 'weekdays':
      return dow >= 1 && dow <= 5
    case 'weekends':
      return dow === 0 || dow === 6
    case 'weekly':
      return (template.recurrence_days ?? []).includes(dow)
    default:
      return false
  }
}

export function useTaskTemplates(userId: string | undefined) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [loading, setLoading] = useState(false)
  /** Missing table, env disable, or sessionStorage from a prior 404 — UI hint; skip logic uses storage + `readTemplatesMissingFromStorage(userId)`. */
  const [templatesTableMissing, setTemplatesTableMissing] = useState(false)

  const fetchTemplates = useCallback(
    async (opts?: { force?: boolean }) => {
      if (taskTemplatesDisabled) {
        setTemplatesTableMissing(true)
        setTemplates([])
        return
      }
      if (!userId) return

      if (opts?.force) {
        clearTemplatesMissingFromStorage(userId)
        setTemplatesTableMissing(false)
      } else if (readTemplatesMissingFromStorage(userId)) {
        setTemplatesTableMissing(true)
        return
      }

      setLoading(true)
      try {
        const { data, error } = await queryTaskTemplatesOnce(userId)
        if (error) {
          if (isMissingTableError(error)) {
            persistTemplatesMissingToStorage(userId)
            setTemplatesTableMissing(true)
            setTemplates([])
          } else {
            console.error('useTaskTemplates fetch:', error)
            setTemplates([])
          }
          return
        }
        setTemplates((data as TaskTemplate[]) ?? [])
        clearTemplatesMissingFromStorage(userId)
        setTemplatesTableMissing(false)
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  useEffect(() => {
    setTemplates([])
    if (!userId) {
      setTemplatesTableMissing(false)
      return
    }
    if (taskTemplatesDisabled) {
      setTemplatesTableMissing(true)
      return
    }
    setTemplatesTableMissing(readTemplatesMissingFromStorage(userId))
  }, [userId])

  useEffect(() => {
    void fetchTemplates()
  }, [fetchTemplates])

  const addTemplate = useCallback(
    async (
      title: string,
      recurrenceType: TaskTemplate['recurrence_type'],
      days: number[] | null,
      category?: string | null
    ) => {
      if (!userId || templatesTableMissing) return
      await supabase.from('task_templates').insert({
        user_id: userId,
        title,
        recurrence_type: recurrenceType,
        recurrence_days: days,
        is_active: true,
        category: category ?? null,
      })
      await fetchTemplates()
    },
    [userId, fetchTemplates, templatesTableMissing]
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      if (templatesTableMissing) return
      await supabase.from('task_templates').delete().eq('id', id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    },
    [templatesTableMissing]
  )

  const toggleTemplate = useCallback(
    async (id: string, is_active: boolean) => {
      if (templatesTableMissing) return
      await supabase.from('task_templates').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id)
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, is_active } : t)))
    },
    [templatesTableMissing]
  )

  // Apply matching templates to a daily entry (create tasks that don't exist yet)
  const applyTemplatesToEntry = useCallback(
    async (entryId: string, date: Date) => {
      if (!userId || templatesTableMissing || templates.length === 0) return

      const matching = templates.filter((t) => templateMatchesDate(t, date))
      if (matching.length === 0) return

      // Fetch existing template-based tasks for this entry
      const { data: existing } = await supabase
        .from('daily_tasks')
        .select('template_id')
        .eq('daily_entry_id', entryId)
        .not('template_id', 'is', null)

      const existingIds = new Set((existing ?? []).map((r: { template_id: string }) => r.template_id))

      const toCreate = matching.filter((t) => !existingIds.has(t.id))
      if (toCreate.length === 0) return

      await supabase.from('daily_tasks').insert(
        toCreate.map((t, i) => ({
          user_id: userId,
          daily_entry_id: entryId,
          title: t.title,
          completed: false,
          sort_order: 1000 + i,
          template_id: t.id,
        }))
      )
    },
    [userId, templates, templatesTableMissing]
  )

  // Carry over uncompleted tasks from the previous day into the given entry
  const carryOverFromPreviousDay = useCallback(
    async (entryId: string, date: Date) => {
      if (!userId) return

      // Don't carry over into past dates (only today and future)
      const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const todayLocal = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}` })()
      if (localDate < todayLocal) return

      const yesterday = new Date(date)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

      // Find yesterday's entry (search by both UTC and local date to be safe)
      const { data: yesterdayEntries } = await supabase
        .from('daily_entries')
        .select('id, entry_date')
        .eq('user_id', userId)
        .gte('entry_date', yesterdayStr)
        .lt('entry_date', localDate)
        .order('entry_date', { ascending: false })
        .limit(1)

      const yesterdayEntry = yesterdayEntries?.[0]
      if (!yesterdayEntry) return

      // Get ALL uncompleted tasks from yesterday
      const { data: uncompletedTasks } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('daily_entry_id', yesterdayEntry.id)
        .eq('completed', false)

      if (!uncompletedTasks || uncompletedTasks.length === 0) return

      // Exclude tasks whose template already matches today (they'll be re-created by applyTemplatesToEntry)
      const tasksToCarryOver = (uncompletedTasks as DailyTask[]).filter((task) => {
        if (!task.template_id) return true
        const tpl = templates.find((t) => t.id === task.template_id)
        if (!tpl) return true // template deleted — carry over
        return !templateMatchesDate(tpl, date) // don't carry over if template fires today anyway
      })

      if (tasksToCarryOver.length === 0) return

      // Deduplicate by title against today's existing tasks
      const { data: todayTasks } = await supabase
        .from('daily_tasks')
        .select('title')
        .eq('daily_entry_id', entryId)

      const todayTitles = new Set((todayTasks ?? []).map((t: { title: string }) => t.title))
      const toInsert = tasksToCarryOver.filter((t) => !todayTitles.has(t.title))

      if (toInsert.length === 0) return

      // Try with carried_over flag (requires migration supabase-migration-carryover.sql)
      const { error } = await supabase.from('daily_tasks').insert(
        toInsert.map((t, i) => ({
          user_id: userId,
          daily_entry_id: entryId,
          title: t.title,
          completed: false,
          sort_order: 2000 + i,
          category: t.category ?? null,
          carried_over: true,
        }))
      )

      // Fallback if column doesn't exist yet
      if (error) {
        await supabase.from('daily_tasks').insert(
          toInsert.map((t, i) => ({
            user_id: userId,
            daily_entry_id: entryId,
            title: t.title,
            completed: false,
            sort_order: 2000 + i,
            category: t.category ?? null,
          }))
        )
      }
    },
    [userId, templates]
  )

  return {
    templates,
    loading,
    templatesTableMissing,
    addTemplate,
    deleteTemplate,
    toggleTemplate,
    applyTemplatesToEntry,
    carryOverFromPreviousDay,
    fetchTemplates,
  }
}
