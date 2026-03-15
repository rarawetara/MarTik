import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { ru } from '../constants/ru'
import type { DailyEntry } from '../lib/supabase'

function formatDateRu(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function Diary() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    supabase
      .from('daily_entries')
      .select('id, entry_date, journal_text, mood, water_ml')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        setEntries((data as DailyEntry[]) ?? [])
        setLoading(false)
      })
  }, [user?.id])

  if (loading) {
    return <p className="empty-state">{ru.loading}</p>
  }

  if (entries.length === 0) {
    return (
      <div className="card">
        <h2>{ru.diary}</h2>
        <p className="empty-state">{ru.noEntries}</p>
        <Link to="/today">{ru.today}</Link>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>{ru.diary}</h2>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 16 }}>{ru.pastDays}</p>
      <ul className="diary-list">
        {entries.map((e) => (
          <li key={e.id}>
            <Link to={`/today?date=${e.entry_date}`}>
              <time dateTime={e.entry_date}>{formatDateRu(e.entry_date)}</time>
              {e.journal_text && (
                <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#444' }}>
                  {e.journal_text.slice(0, 80)}
                  {e.journal_text.length > 80 ? '…' : ''}
                </p>
              )}
              {(e.water_ml > 0 || e.mood) && (
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#888' }}>
                  {e.water_ml > 0 && `${e.water_ml} мл`}
                  {e.water_ml > 0 && e.mood && ' · '}
                  {e.mood && MOOD_LABELS[e.mood]}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

const MOOD_LABELS: Record<string, string> = {
  calm: 'Спокойствие',
  energetic: 'Энергия',
  tired: 'Усталость',
  happy: 'Радость',
  sad: 'Грусть',
  neutral: 'Нейтрально',
}
