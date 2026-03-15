import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { ru } from '../constants/ru'
import type { Profile } from '../lib/supabase'

const TIMEZONES = [
  'Europe/Moscow',
  'Europe/Kyiv',
  'Europe/Minsk',
  'Asia/Almaty',
  'Europe/Berlin',
  'Europe/London',
  'America/New_York',
  'UTC',
]

export function Settings() {
  const { user } = useAuth()
  const [waterGoalMl, setWaterGoalMl] = useState(2000)
  const [timezone, setTimezone] = useState('Europe/Moscow')
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        const p = data as Profile | null
        if (p) {
          setWaterGoalMl(p.water_goal_ml)
          setTimezone(p.timezone)
          setDisplayName(p.display_name ?? '')
        }
      })
  }, [user?.id])

  const save = useCallback(async () => {
    if (!user?.id) return
    setSaving(true)
    setSaved(false)
    await supabase
      .from('profiles')
      .update({
        water_goal_ml: waterGoalMl,
        timezone,
        display_name: displayName || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [user?.id, waterGoalMl, timezone, displayName])

  const signOut = useCallback(() => {
    supabase.auth.signOut()
  }, [])

  return (
    <div className="card">
      <h2>{ru.settings}</h2>

      <div className="form-group">
        <label htmlFor="displayName">{ru.displayName}</label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={save}
          placeholder={ru.displayName}
        />
      </div>

      <div className="form-group">
        <label htmlFor="waterGoal">{ru.waterGoalLabel}</label>
        <input
          id="waterGoal"
          type="number"
          min={500}
          max={5000}
          step={250}
          value={waterGoalMl}
          onChange={(e) => setWaterGoalMl(Number(e.target.value))}
          onBlur={save}
        />
      </div>

      <div className="form-group">
        <label htmlFor="timezone">{ru.timezoneLabel}</label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          onBlur={save}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8 }}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <button type="button" onClick={save} disabled={saving} className="btn-primary" style={{ marginRight: 8 }}>
        {saving ? ru.loading : ru.save}
      </button>
      {saved && <span style={{ fontSize: '0.875rem', color: '#2d5a4a' }}>{ru.saved}</span>}

      <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px solid #eee' }} />

      <button type="button" onClick={signOut} className="btn-ghost">
        {ru.signOut}
      </button>
    </div>
  )
}
