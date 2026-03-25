import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { Outfit, OutfitItem, PlannedOutfit, WardrobeItem } from '../lib/supabase'
import { OUTFIT_SLOT_TYPES } from '../lib/supabase'
import { ru } from '../constants/ru'
import { formatDateRussian } from '../utils/dateFormat'

type OutfitWithItems = Outfit & {
  items: (OutfitItem & { wardrobe_items: WardrobeItem | null })[]
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getWeekDatesAroundToday(): string[] {
  const dates: string[] = []
  const t = new Date()
  for (let i = -3; i <= 3; i++) {
    const d = new Date(t)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function parseDateParam(param: string | null): string | null {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return null
  return param
}

export function PlannedByDate() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const dateFromUrl = parseDateParam(searchParams.get('date'))
  const [selectedDate, setSelectedDate] = useState(() => dateFromUrl ?? todayISO())
  const [planned, setPlanned] = useState<PlannedOutfit | null>(null)
  const [outfitWithItems, setOutfitWithItems] = useState<OutfitWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [replaceModalOpen, setReplaceModalOpen] = useState(false)
  const [replaceOutfits, setReplaceOutfits] = useState<OutfitWithItems[]>([])
  const [replaceSaving, setReplaceSaving] = useState(false)
  const [clearRemoved, setClearRemoved] = useState<string | null>(null)
  const weekDates = getWeekDatesAroundToday()
  const [weekPlanned, setWeekPlanned] = useState<Set<string>>(new Set())

  const fetchPlannedForDate = useCallback(
    async (date: string) => {
      if (!user?.id) {
        setPlanned(null)
        setOutfitWithItems(null)
        setLoading(false)
        return
      }
      setLoading(true)
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_outfits')
        .select('*')
        .eq('user_id', user.id)
        .eq('planned_date', date)
        .maybeSingle()
      if (plannedError) {
        console.error('Planned outfit fetch error:', plannedError)
        setPlanned(null)
        setOutfitWithItems(null)
        setLoading(false)
        return
      }
      const p = plannedData as PlannedOutfit | null
      setPlanned(p ?? null)
      if (!p) {
        setOutfitWithItems(null)
        setLoading(false)
        return
      }
      const { data: outfitData, error: outfitError } = await supabase
        .from('outfits')
        .select('*')
        .eq('id', p.outfit_id)
        .single()
      if (outfitError || !outfitData) {
        setOutfitWithItems(null)
        setLoading(false)
        return
      }
      const outfit = outfitData as Outfit
      const { data: itemsData } = await supabase
        .from('outfit_items')
        .select('*, wardrobe_items(*)')
        .eq('outfit_id', outfit.id)
        .order('sort_order', { ascending: true })
      const items = (itemsData as (OutfitItem & { wardrobe_items: WardrobeItem | null })[]) ?? []
      setOutfitWithItems({ ...outfit, items })
      setLoading(false)
    },
    [user?.id]
  )

  useEffect(() => {
    fetchPlannedForDate(selectedDate)
  }, [selectedDate, fetchPlannedForDate])

  useEffect(() => {
    if (dateFromUrl && dateFromUrl !== selectedDate) setSelectedDate(dateFromUrl)
  }, [dateFromUrl])

  const fetchWeekPlanned = useCallback(async () => {
    if (!user?.id) return
    const dates = getWeekDatesAroundToday()
    const { data } = await supabase
      .from('planned_outfits')
      .select('planned_date')
      .eq('user_id', user.id)
      .in('planned_date', dates)
    const set = new Set<string>()
    ;(data ?? []).forEach((row: { planned_date: string }) => set.add(row.planned_date))
    setWeekPlanned(set)
  }, [user?.id])

  useEffect(() => {
    fetchWeekPlanned()
  }, [fetchWeekPlanned])

  useEffect(() => {
    if (!replaceModalOpen || !user?.id) return
    let cancelled = false
    const load = async () => {
      const { data: outfitsData } = await supabase
        .from('outfits')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
      if (cancelled) return
      const list = (outfitsData as Outfit[]) ?? []
      const withItems: OutfitWithItems[] = []
      for (const outfit of list) {
        const { data: itemsData } = await supabase
          .from('outfit_items')
          .select('*, wardrobe_items(*)')
          .eq('outfit_id', outfit.id)
          .order('sort_order', { ascending: true })
        const items = (itemsData as (OutfitItem & { wardrobe_items: WardrobeItem | null })[]) ?? []
        withItems.push({ ...outfit, items })
      }
      setReplaceOutfits(withItems)
    }
    load()
    return () => { cancelled = true }
  }, [replaceModalOpen, user?.id])

  const handleReplace = useCallback(
    async (outfit: OutfitWithItems) => {
      if (!user?.id) return
      setReplaceSaving(true)
      const { error } = await supabase.from('planned_outfits').upsert(
        {
          user_id: user.id,
          outfit_id: outfit.id,
          planned_date: selectedDate,
          status: 'planned',
          notes: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,planned_date' }
      )
      setReplaceSaving(false)
      if (error) {
        console.error('Replace planned outfit error:', error)
        return
      }
      setReplaceModalOpen(false)
      await fetchPlannedForDate(selectedDate)
      await fetchWeekPlanned()
    },
    [user?.id, selectedDate, fetchPlannedForDate, fetchWeekPlanned]
  )

  const handleClear = useCallback(async () => {
    if (!user?.id || !planned) return
    if (!window.confirm(ru.clearFromDateConfirm)) return
    const { error } = await supabase
      .from('planned_outfits')
      .delete()
      .eq('user_id', user.id)
      .eq('planned_date', selectedDate)
    if (error) {
      console.error('Clear planned outfit error:', error)
      return
    }
    setClearRemoved(selectedDate)
    setTimeout(() => setClearRemoved(null), 2500)
    setPlanned(null)
    setOutfitWithItems(null)
    fetchWeekPlanned()
  }, [user?.id, planned, selectedDate, fetchWeekPlanned])

  return (
    <main className="main">
      <header className="outfit-list-header">
        <Link to="/wardrobe/outfits" className="outfit-builder-back">
          ← {ru.myOutfits}
        </Link>
        <h1 className="outfit-list-title">{ru.plannedByDateTitle}</h1>
      </header>

      <div className="planned-week-strip">
        {weekDates.map((date) => (
          <button
            key={date}
            type="button"
            className={`planned-week-day ${date === selectedDate ? 'planned-week-day--selected' : ''} ${weekPlanned.has(date) ? 'planned-week-day--has' : ''}`}
            onClick={() => setSelectedDate(date)}
            title={formatDateRussian(date)}
          >
            <span className="planned-week-day-num">{date.slice(8, 10)}</span>
            {weekPlanned.has(date) && <span className="planned-week-day-dot" aria-hidden />}
          </button>
        ))}
      </div>

      <label className="planned-by-date-label">
        {ru.selectDate}
        <input
          type="date"
          className="planned-by-date-input"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </label>

      {clearRemoved === selectedDate && (
        <p className="planned-by-date-success">{ru.outfitRemovedFromDate}</p>
      )}

      {loading ? (
        <p className="wardrobe-empty">{ru.loading}</p>
      ) : !planned ? (
        <p className="planned-by-date-empty">{ru.noPlannedOutfitForDate}</p>
      ) : outfitWithItems ? (
        <section className="planned-by-date-result">
          <h2 className="planned-by-date-result-title">{ru.onThisDatePlanned}</h2>
          <p className="planned-by-date-result-date">
            {ru.plannedOutfitFor} {formatDateRussian(selectedDate)}
          </p>
          <article className="outfit-card planned-by-date-card">
            <div className="outfit-card__preview">
              {outfitWithItems.cover_photo_url ? (
                <>
                  <div className="outfit-cover planned-by-date-cover">
                    <img src={outfitWithItems.cover_photo_url} alt="" />
                  </div>
                  {outfitWithItems.items.length > 0 && (
                    <div className="outfit-preview-strip">
                      {OUTFIT_SLOT_TYPES.map((slot) => {
                        const row = outfitWithItems.items.find((r) => r.slot_type === slot)
                        const item = row?.wardrobe_items
                        if (!item) return null
                        return (
                          <div key={slot} className="outfit-preview-strip__thumb">
                            {item.photo_url ? (
                              <img src={item.photo_url} alt="" />
                            ) : (
                              <div className="outfit-preview-strip__placeholder" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="outfit-card__thumbnails">
                    {OUTFIT_SLOT_TYPES.map((slot) => {
                      const row = outfitWithItems.items.find((r) => r.slot_type === slot)
                      const item = row?.wardrobe_items
                      if (!item) return null
                      return (
                        <div key={slot} className="outfit-card__thumb">
                          {item.photo_url ? (
                            <img src={item.photo_url} alt="" />
                          ) : (
                            <div className="outfit-card__thumb-placeholder" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {outfitWithItems.items.length === 0 && (
                    <div className="outfit-card__no-items">{ru.noItemInSlot}</div>
                  )}
                </>
              )}
            </div>
            <div className="outfit-card__body">
              <h3 className="outfit-card__name">{outfitWithItems.name}</h3>
              <div className="planned-by-date-actions">
                <button
                  type="button"
                  className="btn-ghost planned-by-date-btn planned-by-date-btn--replace"
                  onClick={() => setReplaceModalOpen(true)}
                >
                  {ru.replaceOutfit}
                </button>
                <button
                  type="button"
                  className="btn-ghost planned-by-date-btn planned-by-date-btn--clear"
                  onClick={handleClear}
                >
                  {ru.clearFromDate}
                </button>
              </div>
            </div>
          </article>
        </section>
      ) : (
        <p className="planned-by-date-empty">{ru.noPlannedOutfitForDate}</p>
      )}

      {replaceModalOpen && (
        <div
          className="plan-outfit-modal-overlay"
          onClick={() => setReplaceModalOpen(false)}
          role="presentation"
        >
          <div className="plan-outfit-modal replace-outfit-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="plan-outfit-modal-title">{ru.pickOutfitToReplace}</h3>
            <div className="replace-outfit-list">
              {replaceOutfits.map((outfit) => (
                <button
                  key={outfit.id}
                  type="button"
                  className="replace-outfit-item"
                  onClick={() => handleReplace(outfit)}
                  disabled={replaceSaving}
                >
                  <span className="replace-outfit-item-name">{outfit.name}</span>
                  {replaceSaving ? ` (${ru.loading})` : null}
                </button>
              ))}
            </div>
            <div className="plan-outfit-modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setReplaceModalOpen(false)}>
                {ru.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
