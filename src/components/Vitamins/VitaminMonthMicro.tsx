import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { VitaminLog } from '../../lib/supabase'

type Props = { userId: string }

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

/** Intensity 0–4 from share of active vitamins logged that day */
function levelForDay(
  dateStr: string,
  today: string,
  countByDate: Map<string, number>,
  totalActive: number
): 0 | 1 | 2 | 3 | 4 {
  if (totalActive <= 0) return 0
  if (dateStr > today) return 0
  const taken = countByDate.get(dateStr) ?? 0
  const pct = taken / totalActive
  if (pct === 0) return 0
  if (pct < 0.34) return 1
  if (pct < 0.67) return 2
  if (pct < 1) return 3
  return 4
}

export function VitaminMonthMicro({ userId }: Props) {
  const [logs, setLogs] = useState<VitaminLog[]>([])
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const { year, month, days, monthLabel, today } = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const last = new Date(y, m + 1, 0).getDate()
    const t = now.toISOString().slice(0, 10)
    const label = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    const dayDates: string[] = []
    for (let d = 1; d <= last; d++) {
      dayDates.push(`${y}-${pad2(m + 1)}-${pad2(d)}`)
    }
    return { year: y, month: m, days: dayDates, monthLabel: label, today: t }
  }, [])

  useEffect(() => {
    let cancelled = false
    const from = `${year}-${pad2(month + 1)}-01`
    const last = new Date(year, month + 1, 0).getDate()
    const to = `${year}-${pad2(month + 1)}-${pad2(last)}`

    ;(async () => {
      setLoading(true)
      const [{ data: vitData }, { data: logData }] = await Promise.all([
        supabase.from('vitamins').select('id').eq('user_id', userId).eq('is_active', true),
        supabase
          .from('vitamin_logs')
          .select('vitamin_id, log_date')
          .eq('user_id', userId)
          .gte('log_date', from)
          .lte('log_date', to),
      ])
      if (cancelled) return
      const ids = (vitData as { id: string }[] | null)?.length ?? 0
      setActiveCount(ids)
      setLogs((logData as VitaminLog[]) ?? [])
      setLoading(false)
    })()

    return () => { cancelled = true }
  }, [userId, year, month])

  const countByDate = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const l of logs) {
      if (!m.has(l.log_date)) m.set(l.log_date, new Set())
      m.get(l.log_date)!.add(l.vitamin_id)
    }
    const counts = new Map<string, number>()
    m.forEach((set, d) => counts.set(d, set.size))
    return counts
  }, [logs])

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const padCells = Array.from({ length: firstDow }, (_, i) => <div key={`p-${i}`} className="home-vitamin-micro__cell home-vitamin-micro__cell--pad" />)

  if (loading) {
    return (
      <div className="home-vitamin-micro">
        <p className="home-vitamin-micro__label ds-muted">Витамины</p>
        <p className="ds-muted" style={{ fontSize: 11 }}>…</p>
      </div>
    )
  }

  if (activeCount === 0) {
    return (
      <div className="home-vitamin-micro">
        <p className="home-vitamin-micro__label">Витамины</p>
        <Link to="/beauty?tab=vitamins" className="home-vitamin-micro__link">
          Добавить
        </Link>
      </div>
    )
  }

  return (
    <div className="home-vitamin-micro">
      <div className="home-vitamin-micro__row">
        <p className="home-vitamin-micro__label">Витамины</p>
        <span className="home-vitamin-micro__month">{monthLabel}</span>
      </div>
      <div className="home-vitamin-micro__grid" role="img" aria-label={`Приём витаминов за ${monthLabel}`}>
        {padCells}
        {days.map((d) => {
          const level = levelForDay(d, today, countByDate, activeCount)
          const isToday = d === today
          return (
            <div
              key={d}
              className={`home-vitamin-micro__cell home-vitamin-micro__cell--l${level}${isToday ? ' home-vitamin-micro__cell--today' : ''}`}
              title={d}
            />
          )
        })}
      </div>
      <Link to="/beauty?tab=vitamins" className="home-vitamin-micro__link subtle">
        Настроить
      </Link>
    </div>
  )
}
