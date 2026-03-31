import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TaskCategory } from '../lib/supabase'

const DEFAULT_CATEGORIES = ['Личное', 'Работа', 'Здоровье']

export function useTaskCategories(userId: string | undefined) {
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCategories = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const { data } = await supabase
      .from('task_categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    const rows = (data as TaskCategory[]) ?? []

    // Seed default categories on first use
    if (rows.length === 0) {
      const inserts = DEFAULT_CATEGORIES.map((name, i) => ({
        user_id: userId,
        name,
        sort_order: i,
      }))
      const { data: inserted } = await supabase
        .from('task_categories')
        .insert(inserts)
        .select()
      setCategories((inserted as TaskCategory[]) ?? [])
    } else {
      setCategories(rows)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  const addCategory = useCallback(
    async (name: string) => {
      if (!userId || !name.trim()) return
      const { data } = await supabase
        .from('task_categories')
        .insert({ user_id: userId, name: name.trim(), sort_order: categories.length })
        .select()
        .single()
      if (data) setCategories((prev) => [...prev, data as TaskCategory])
    },
    [userId, categories.length]
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      await supabase.from('task_categories').delete().eq('id', id)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    },
    []
  )

  return { categories, loading, addCategory, deleteCategory, fetchCategories }
}
