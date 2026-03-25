import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TaskTemplate } from '../lib/supabase'

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

  const fetchTemplates = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('task_templates')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
    setTemplates((data as TaskTemplate[]) ?? [])
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const addTemplate = useCallback(
    async (
      title: string,
      recurrenceType: TaskTemplate['recurrence_type'],
      days: number[] | null,
      category?: string | null
    ) => {
      if (!userId) return
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
    [userId, fetchTemplates]
  )

  const deleteTemplate = useCallback(
    async (id: string) => {
      await supabase.from('task_templates').delete().eq('id', id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    },
    []
  )

  const toggleTemplate = useCallback(
    async (id: string, is_active: boolean) => {
      await supabase.from('task_templates').update({ is_active, updated_at: new Date().toISOString() }).eq('id', id)
      setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, is_active } : t)))
    },
    []
  )

  // Apply matching templates to a daily entry (create tasks that don't exist yet)
  const applyTemplatesToEntry = useCallback(
    async (entryId: string, date: Date) => {
      if (!userId || templates.length === 0) return

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
    [userId, templates]
  )

  return { templates, loading, addTemplate, deleteTemplate, toggleTemplate, applyTemplatesToEntry, fetchTemplates }
}
