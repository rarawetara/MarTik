import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useGetOrCreateToday } from '../hooks/useGetOrCreateToday'
import { WaterWidget } from '../components/WaterWidget'
import { supabase } from '../lib/supabase'
import { ru } from '../constants/ru'
import { useCallback, useEffect, useState } from 'react'
import type { Profile } from '../lib/supabase'

function getGreeting(displayName: string | null | undefined): string {
  const h = new Date().getHours()
  let base: string
  if (h < 12) base = ru.goodMorning
  else if (h < 18) base = ru.goodAfternoon
  else base = ru.goodEvening
  const name = displayName?.trim()
  if (name) return `${base}, ${name}`
  return base
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function Home() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const { entry, loading: entryLoading, refetch } = useGetOrCreateToday(user?.id, profile?.timezone)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setProfile(data as Profile | null))
  }, [user?.id])

  const handleAddWater = useCallback(() => {
    refetch()
  }, [refetch])

  const handleUpdateWater = useCallback(
    async (updates: { water_ml: number }) => {
      if (!entry?.id) return
      await supabase.from('daily_entries').update({ water_ml: updates.water_ml, updated_at: new Date().toISOString() }).eq('id', entry.id)
      refetch()
    },
    [entry?.id, refetch]
  )

  if (entryLoading && !entry) {
    return <p className="empty-state">{ru.loading}</p>
  }

  return (
    <>
      <section className="card">
        <h2 style={{ marginBottom: 4 }}>{getGreeting(profile?.display_name)}</h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.95rem' }}>
          {formatDate(new Date())}
        </p>
        <Link to="/today" className="btn-ghost" style={{ marginTop: 12, display: 'inline-block' }}>
          {ru.openToday}
        </Link>
      </section>

      <section className="card">
        <h3>{ru.noOutfitPlanned}</h3>
        <Link to="/today">{ru.planYourLook}</Link>
      </section>

      <WaterWidget
        entry={entry}
        goalMl={profile?.water_goal_ml ?? 2000}
        onAddWater={handleAddWater}
        onUpdateEntry={handleUpdateWater}
        disabled={!user}
      />

      <section className="card">
        <h3>{ru.beautyRoutine}</h3>
        <p className="empty-state" style={{ margin: 0 }}>{ru.comingSoonBeauty}</p>
      </section>

      <section className="card">
        <h3>{ru.focus}</h3>
        <p className="empty-state" style={{ margin: 0 }}>{ru.comingSoonFocus}</p>
      </section>

      <section className="card">
        <Link to="/today">{ru.addNote}</Link>
      </section>
    </>
  )
}
