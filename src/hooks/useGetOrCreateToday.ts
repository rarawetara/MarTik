import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { DailyEntry } from '../lib/supabase'

function todayDateString(timezone?: string): string {
  if (timezone && timezone !== 'UTC') {
    try {
      return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
    } catch {
      return new Date().toLocaleDateString('en-CA')
    }
  }
  return new Date().toISOString().slice(0, 10)
}

export function useGetOrCreateToday(userId: string | undefined, timezone?: string) {
  const [entry, setEntry] = useState<DailyEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const getOrCreateToday = useCallback(async () => {
    if (!userId) return null
    const today = todayDateString(timezone)
    const { data: existing } = await supabase
      .from('daily_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('entry_date', today)
      .maybeSingle()

    if (existing) {
      setEntry(existing as DailyEntry)
      return existing as DailyEntry
    }

    const { data: inserted, error: insertError } = await supabase
      .from('daily_entries')
      .insert({ user_id: userId, entry_date: today })
      .select()
      .single()

    if (insertError) {
      setError(insertError as unknown as Error)
      return null
    }
    setEntry(inserted as DailyEntry)
    return inserted as DailyEntry
  }, [userId, timezone])

  useEffect(() => {
    if (!userId) {
      setEntry(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    getOrCreateToday().finally(() => setLoading(false))
  }, [userId, getOrCreateToday])

  return { entry, loading, error, refetch: getOrCreateToday }
}
