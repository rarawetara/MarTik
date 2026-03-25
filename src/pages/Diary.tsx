import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { DailyEntry } from '../lib/supabase'

// ─── constants ────────────────────────────────────────────────────
const DAYS = 56
const WEEK_PRIZE_MIN = 4 // score per day to count day as "done"

const DOW = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

const PILLAR_LABELS = ['Вода', 'Настроение', 'Заметка', 'Задачи', 'Уход'] as const

// ─── helpers ──────────────────────────────────────────────────────
function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildDates(n: number): string[] {
  const base = new Date()
  base.setHours(12, 0, 0, 0)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() - i)
    return toYmd(d)
  })
}

function getMondayKey(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const diff = d.getDay() === 0 ? 6 : d.getDay() - 1
  const mon = new Date(d)
  mon.setDate(d.getDate() - diff)
  return toYmd(mon)
}

function pillarsOf(
  entry: DailyEntry | null,
  hasTasks: boolean,
  hasCare: boolean,
): boolean[] {
  if (!entry) return [false, false, false, false, false]
  return [
    entry.water_ml > 0,
    Boolean(entry.mood),
    Boolean(entry.journal_text?.trim()),
    hasTasks,
    hasCare,
  ]
}

function scoreLabel(score: number) {
  if (score === 5) return 'full'
  if (score >= 3) return 'good'
  if (score >= 1) return 'low'
  return 'empty'
}

// ─── types ────────────────────────────────────────────────────────
type DayData = { dateIso: string; entry: DailyEntry | null; pillars: boolean[] }
type WeekGroup = { mondayKey: string; days: DayData[] }

// ─── component ────────────────────────────────────────────────────
export function Diary() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<DailyEntry[]>([])
  const [tasksMap, setTasksMap] = useState<Set<string>>(new Set())
  const [careMap, setCareMap] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const todayIso = toYmd(new Date())
  const dates = useMemo(() => buildDates(DAYS), [])

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }

    const oldest = dates[dates.length - 1]

    Promise.all([
      supabase
        .from('daily_entries')
        .select('id, user_id, entry_date, journal_text, mood, water_ml, daily_photos, progress_photos, habits, created_at, updated_at')
        .eq('user_id', user.id)
        .gte('entry_date', oldest)
        .order('entry_date', { ascending: false }),

      supabase
        .from('daily_tasks')
        .select('daily_entry_id')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('created_at', oldest + 'T00:00:00'),

      supabase
        .from('beauty_logs')
        .select('daily_entry_id')
        .gte('completed_at', oldest + 'T00:00:00'),
    ]).then(([entriesRes, tasksRes, careRes]) => {
      setEntries((entriesRes.data as DailyEntry[]) ?? [])
      setTasksMap(new Set((tasksRes.data ?? []).map((r: { daily_entry_id: string }) => r.daily_entry_id)))
      setCareMap(new Set((careRes.data ?? []).map((r: { daily_entry_id: string }) => r.daily_entry_id)))
      setLoading(false)
    })
  }, [user?.id, dates])

  const entryMap = useMemo(() => new Map(entries.map((e) => [e.entry_date, e])), [entries])

  const weeks = useMemo<WeekGroup[]>(() => {
    const grouped = new Map<string, DayData[]>()

    for (const iso of dates) {
      const entry = entryMap.get(iso) ?? null
      const pillars = pillarsOf(entry, tasksMap.has(entry?.id ?? ''), careMap.has(entry?.id ?? ''))
      const key = getMondayKey(iso)
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push({ dateIso: iso, entry, pillars })
    }

    return Array.from(grouped.entries()).map(([mondayKey, days]) => ({ mondayKey, days }))
  }, [dates, entryMap, tasksMap, careMap])

  if (loading) return <p className="empty-state">Загрузка…</p>

  return (
    <div className="diary-page card">
      <h2 className="ds-page-title">Дневник</h2>

      {weeks.map(({ mondayKey, days }) => {
        const scores = days.map((d) => d.pillars.filter(Boolean).length)
        const doneCount = scores.filter((s) => s >= WEEK_PRIZE_MIN).length
        const weekTotal = Math.round((scores.reduce((a, b) => a + b, 0) / (days.length * 5)) * 100)
        const hasPrize = doneCount >= 5

        const monDate = new Date(mondayKey + 'T12:00:00')
        const sunDate = new Date(monDate); sunDate.setDate(monDate.getDate() + 6)
        const weekLabel = `${monDate.getDate()} ${MONTHS[monDate.getMonth()]} — ${sunDate.getDate()} ${MONTHS[sunDate.getMonth()]}`

        return (
          <section key={mondayKey} className="diary-week">
            <header className="diary-week__header">
              <span className="diary-week__label">{weekLabel}</span>
              <div className="diary-week__meta">
                <span className="diary-week__pct">{weekTotal}%</span>
                {hasPrize && <Trophy className="diary-week__trophy" size={14} />}
              </div>
            </header>

            <ul className="diary-list">
              {days.map(({ dateIso, entry, pillars }) => {
                const d = new Date(dateIso + 'T12:00:00')
                const score = pillars.filter(Boolean).length
                const pct = score * 20
                const isToday = dateIso === todayIso

                return (
                  <li
                    key={dateIso}
                    className={[
                      'diary-row',
                      `diary-row--${scoreLabel(score)}`,
                      isToday && 'diary-row--today',
                    ].filter(Boolean).join(' ')}
                  >
                    <Link to={`/today?date=${dateIso}`} className="diary-row__link">
                      <div className="diary-row__date">
                        <span className="diary-row__dow">{DOW[d.getDay()]}</span>
                        <span className="diary-row__dnum">{d.getDate()}</span>
                        <span className="diary-row__month">{MONTHS[d.getMonth()]}</span>
                      </div>

                      <div className="diary-row__pillars">
                        {pillars.map((done, i) => (
                          <span
                            key={i}
                            className={`diary-pillar diary-pillar--${done ? 'done' : 'empty'}`}
                            title={PILLAR_LABELS[i]}
                          />
                        ))}
                      </div>

                      <div className="diary-row__right">
                        {entry ? (
                          <span className="diary-row__pct">{pct}%</span>
                        ) : (
                          <span className="diary-row__empty-hint">—</span>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
