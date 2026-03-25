import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { Outfit, OutfitItem, WardrobeItem } from '../lib/supabase'
import { OUTFIT_SLOT_TYPES } from '../lib/supabase'
import { ru } from '../constants/ru'
import { formatDateRussian } from '../utils/dateFormat'

type OutfitWithItems = Outfit & {
  items: (OutfitItem & { wardrobe_items: WardrobeItem | null })[]
}

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export function OutfitList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [outfits, setOutfits] = useState<OutfitWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [planModalOutfit, setPlanModalOutfit] = useState<OutfitWithItems | null>(null)
  const [planDate, setPlanDate] = useState(todayISO())
  const [planSaving, setPlanSaving] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planSuccessMessage, setPlanSuccessMessage] = useState<string | null>(null)
  const [dateAlreadyPlanned, setDateAlreadyPlanned] = useState(false)

  const fetchOutfits = useCallback(async () => {
    if (!user?.id) return
    const { data: outfitsData, error: outfitsError } = await supabase
      .from('outfits')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
    if (outfitsError) {
      console.error('Outfits fetch error:', outfitsError)
      setOutfits([])
      setLoading(false)
      return
    }
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
    setOutfits(withItems)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    fetchOutfits()
  }, [fetchOutfits])

  useEffect(() => {
    if (!planModalOutfit || !user?.id) {
      setDateAlreadyPlanned(false)
      return
    }
    let cancelled = false
    supabase
      .from('planned_outfits')
      .select('id')
      .eq('user_id', user.id)
      .eq('planned_date', planDate)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setDateAlreadyPlanned(!!data)
      })
    return () => { cancelled = true }
  }, [planModalOutfit, planDate, user?.id])

  const handleDelete = useCallback(
    async (outfit: Outfit) => {
      if (!window.confirm(ru.deleteOutfitConfirm)) return
      const { error } = await supabase
        .from('outfits')
        .delete()
        .eq('id', outfit.id)
        .eq('user_id', user?.id)
      if (error) {
        console.error('Delete outfit error:', error)
        return
      }
      await fetchOutfits()
    },
    [user?.id, fetchOutfits]
  )

  const openPlanModal = useCallback((outfit: OutfitWithItems) => {
    setPlanModalOutfit(outfit)
    setPlanDate(todayISO())
    setPlanError(null)
    setPlanSuccessMessage(null)
  }, [])

  const closePlanModal = useCallback(() => {
    setPlanModalOutfit(null)
    setPlanError(null)
    setPlanSuccessMessage(null)
  }, [])

  const handlePlanSave = useCallback(async () => {
    if (!user?.id || !planModalOutfit) return
    setPlanSaving(true)
    setPlanError(null)
    const { error } = await supabase.from('planned_outfits').upsert(
      {
        user_id: user.id,
        outfit_id: planModalOutfit.id,
        planned_date: planDate,
        status: 'planned',
        notes: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,planned_date' }
    )
    setPlanSaving(false)
    if (error) {
      console.error('Plan outfit error:', error)
      setPlanError(ru.error)
      return
    }
    const formatted = formatDateRussian(planDate)
    setPlanSuccessMessage(`${ru.plannedOutfitSavedOn} ${formatted}`)
  }, [user?.id, planModalOutfit, planDate])

  const handlePlanSuccessOk = useCallback(() => {
    closePlanModal()
  }, [closePlanModal])

  return (
    <div className="catalog-page outfit-list-page">
      <header className="catalog-header">
        <h1 className="catalog-header__title">{ru.myOutfits}</h1>
        <nav className="catalog-header__nav">
          <Link to="/wardrobe" className="catalog-header__tab">Вещи</Link>
          <Link to="/wardrobe/outfits" className="catalog-header__tab catalog-header__tab--active">{ru.myOutfits}</Link>
        </nav>
      </header>
      <div className="catalog-toolbar">
        <div className="catalog-toolbar__filters" />
        <div className="catalog-toolbar__actions">
          <Link to="/wardrobe/planned" className="btn-secondary">{ru.viewByDate}</Link>
          <Link to="/wardrobe/outfits/new" className="btn-primary">{ru.newOutfit}</Link>
        </div>
      </div>

      {loading ? (
        <p className="wardrobe-empty">{ru.loading}</p>
      ) : outfits.length === 0 ? (
        <p className="wardrobe-empty">{ru.noOutfits}</p>
      ) : (
        <div className="catalog-grid">
          {outfits.map((outfit) => (
            <article
              key={outfit.id}
              className="catalog-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/wardrobe/outfits/${outfit.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/wardrobe/outfits/${outfit.id}`)
                }
              }}
            >
              <div className="catalog-card__media">
                {outfit.cover_photo_url ? (
                  <img src={outfit.cover_photo_url} alt="" className="catalog-card__img" />
                ) : (
                  <div className="catalog-card__placeholder outfit-card-mosaic" aria-hidden>
                    {OUTFIT_SLOT_TYPES.map((slot) => {
                      const item = outfit.items.find((r) => r.slot_type === slot)?.wardrobe_items
                      if (!item) return null
                      return (
                        <div key={slot} className="outfit-card-mosaic__cell">
                          {item.photo_url
                            ? <img src={item.photo_url} alt="" />
                            : <div className="outfit-card-mosaic__placeholder" />}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="catalog-card__body">
                <span className="catalog-card__tag">образ</span>
                <h3 className="catalog-card__name">{outfit.name}</h3>
              </div>

              <div className="catalog-card__actions">
                <button
                  type="button"
                  className="catalog-card__btn catalog-card__btn--plan"
                  onClick={(e) => { e.stopPropagation(); openPlanModal(outfit) }}
                >
                  {ru.planOutfit}
                </button>
                <button
                  type="button"
                  className="catalog-card__btn catalog-card__btn--edit"
                  onClick={(e) => { e.stopPropagation(); navigate(`/wardrobe/outfits/${outfit.id}`) }}
                  aria-label={ru.editOutfit}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  className="catalog-card__btn catalog-card__btn--delete"
                  onClick={(e) => { e.stopPropagation(); handleDelete(outfit) }}
                  aria-label={ru.delete}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {planModalOutfit && (
        <div className="plan-outfit-modal-overlay" onClick={closePlanModal} role="presentation">
          <div className="plan-outfit-modal" onClick={(e) => e.stopPropagation()}>
            {planSuccessMessage ? (
              <>
                <p className="plan-outfit-modal-success">{planSuccessMessage}</p>
                <div className="plan-outfit-modal-actions">
                  <button type="button" className="btn-primary" onClick={handlePlanSuccessOk}>
                    {ru.ok}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="plan-outfit-modal-title">{ru.planOutfitTitle}</h3>
                <p className="plan-outfit-modal-outfit-name">{planModalOutfit.name}</p>
                <label className="plan-outfit-modal-label">
                  {ru.plannedDate}
                  <input
                    type="date"
                    className="plan-outfit-modal-input"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                  />
                </label>
                {dateAlreadyPlanned && (
                  <p className="plan-outfit-modal-already">{ru.dateAlreadyHasOutfit}</p>
                )}
                {planError && <p className="plan-outfit-modal-error">{planError}</p>}
                <div className="plan-outfit-modal-actions">
                  <button type="button" className="btn-ghost" onClick={closePlanModal}>
                    {ru.cancel}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handlePlanSave}
                    disabled={planSaving}
                  >
                    {planSaving ? ru.loading : dateAlreadyPlanned ? ru.replaceOutfit : ru.savePlan}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
