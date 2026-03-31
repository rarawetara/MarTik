import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Vitamin, VitaminLog } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useVitamins() {
  const { user } = useAuth()
  const [vitamins, setVitamins] = useState<Vitamin[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user?.id) { setVitamins([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('vitamins')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    setVitamins((data as Vitamin[]) ?? [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => { fetch() }, [fetch])

  const add = useCallback(
    async (name: string, dosage: string, notes: string, is_active = true) => {
      if (!user?.id) return
      await supabase.from('vitamins').insert({
        user_id: user.id,
        name: name.trim(),
        dosage: dosage.trim() || null,
        notes: notes.trim() || null,
        is_active,
        sort_order: vitamins.length,
        updated_at: new Date().toISOString(),
      })
      await fetch()
    },
    [user?.id, vitamins.length, fetch]
  )

  const update = useCallback(async (id: string, patch: Partial<Pick<Vitamin, 'name' | 'dosage' | 'notes' | 'is_active'>>) => {
    await supabase
      .from('vitamins')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    setVitamins((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)))
  }, [])

  const remove = useCallback(async (id: string) => {
    await supabase.from('vitamins').delete().eq('id', id)
    setVitamins((prev) => prev.filter((v) => v.id !== id))
  }, [])

  return { vitamins, loading, refetch: fetch, add, update, remove }
}

// ── Logs for a specific date range ────────────────────────────────────────────

export function useVitaminLogs(fromDate: string, toDate: string) {
  const { user } = useAuth()
  const [logs, setLogs] = useState<VitaminLog[]>([])

  const fetch = useCallback(async () => {
    if (!user?.id) { setLogs([]); return }
    const { data } = await supabase
      .from('vitamin_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', fromDate)
      .lte('log_date', toDate)
    setLogs((data as VitaminLog[]) ?? [])
  }, [user?.id, fromDate, toDate])

  useEffect(() => { fetch() }, [fetch])

  const toggle = useCallback(async (vitaminId: string, date: string, userId: string) => {
    const exists = logs.find((l) => l.vitamin_id === vitaminId && l.log_date === date)
    if (exists) {
      await supabase.from('vitamin_logs').delete().eq('id', exists.id)
      setLogs((prev) => prev.filter((l) => l.id !== exists.id))
    } else {
      const { data } = await supabase
        .from('vitamin_logs')
        .insert({ user_id: userId, vitamin_id: vitaminId, log_date: date })
        .select()
        .single()
      if (data) setLogs((prev) => [...prev, data as VitaminLog])
    }
  }, [logs])

  return { logs, refetch: fetch, toggle }
}
