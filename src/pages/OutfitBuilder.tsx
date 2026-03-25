import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import type { Outfit, OutfitItem, WardrobeItem } from '../lib/supabase'
import { OUTFIT_SLOT_TYPES, OUTFITS_BUCKET, type OutfitSlotType } from '../lib/supabase'
import { ru } from '../constants/ru'

const SLOT_LABELS: Record<OutfitSlotType, string> = {
  top: ru.slotTop,
  bottom: ru.slotBottom,
  dress: ru.slotDress,
  outerwear: ru.slotOuterwear,
  shoes: ru.slotShoes,
  accessory: ru.slotAccessory,
}

type SlotState = Partial<Record<OutfitSlotType, WardrobeItem | null>>

export function OutfitBuilder() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const preselectedIds = searchParams.get('items')?.split(',').filter(Boolean) ?? []
  const navigate = useNavigate()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [slots, setSlots] = useState<SlotState>({})
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([])
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWardrobe = useCallback(async () => {
    if (!user?.id) return
    const { data, error: e } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (e) {
      console.error('Wardrobe fetch error:', e)
      setWardrobeItems([])
      return
    }
    setWardrobeItems((data as WardrobeItem[]) ?? [])
  }, [user?.id])

  const fetchOutfit = useCallback(async () => {
    if (!user?.id || !id) return
    const { data: outfitData, error: outfitError } = await supabase
      .from('outfits')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (outfitError || !outfitData) {
      setLoading(false)
      setError(ru.error)
      return
    }
    const outfit = outfitData as Outfit
    setName(outfit.name)
    setNotes(outfit.notes ?? '')
    setCoverPreviewUrl(outfit.cover_photo_url ?? null)

    const { data: itemsData, error: itemsError } = await supabase
      .from('outfit_items')
      .select('*, wardrobe_items(*)')
      .eq('outfit_id', id)
    if (itemsError) {
      setSlots({})
      setLoading(false)
      return
    }
    const items = (itemsData as (OutfitItem & { wardrobe_items: WardrobeItem | null })[]) ?? []
    const nextSlots: SlotState = {}
    OUTFIT_SLOT_TYPES.forEach((slot) => {
      const row = items.find((r) => r.slot_type === slot)
      nextSlots[slot] = row?.wardrobe_items ?? null
    })
    setSlots(nextSlots)
    setLoading(false)
  }, [user?.id, id])

  useEffect(() => {
    fetchWardrobe()
  }, [fetchWardrobe])

  useEffect(() => {
    if (id) {
      fetchOutfit()
    } else {
      setLoading(false)
      setSlots(OUTFIT_SLOT_TYPES.reduce<SlotState>((acc, s) => ({ ...acc, [s]: null }), {}))
    }
  }, [id, fetchOutfit])

  // Pre-populate slots from ?items= query param
  useEffect(() => {
    if (id || preselectedIds.length === 0 || wardrobeItems.length === 0) return
    const nextSlots: SlotState = OUTFIT_SLOT_TYPES.reduce<SlotState>((acc, s) => ({ ...acc, [s]: null }), {})
    for (const itemId of preselectedIds) {
      const item = wardrobeItems.find((w) => w.id === itemId)
      if (!item) continue
      const slot = item.category as OutfitSlotType | undefined
      if (slot && OUTFIT_SLOT_TYPES.includes(slot) && !nextSlots[slot]) {
        nextSlots[slot] = item
      }
    }
    setSlots(nextSlots)
  }, [wardrobeItems, preselectedIds, id])

  const setSlot = useCallback((slot: OutfitSlotType, item: WardrobeItem | null) => {
    setSlots((prev) => ({ ...prev, [slot]: item }))
    setError(null)
  }, [])

  const getExt = (file: File): string => {
    const m = file.name.match(/\.(jpe?g|png|webp|gif)$/i)
    return m ? m[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg'
  }

  const handleSave = useCallback(async () => {
    if (!user?.id) return
    const nameTrim = name.trim()
    if (!nameTrim) {
      setError(ru.wardrobeNameRequired)
      return
    }
    setSaving(true)
    setError(null)
    try {
      let outfitId: string
      if (id) {
        const { error: updateErr } = await supabase
          .from('outfits')
          .update({
            name: nameTrim,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', user.id)
        if (updateErr) throw new Error(updateErr.message)
        outfitId = id
        const { error: delErr } = await supabase.from('outfit_items').delete().eq('outfit_id', id)
        if (delErr) throw new Error(delErr.message)
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('outfits')
          .insert({
            user_id: user.id,
            name: nameTrim,
            notes: notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        if (insertErr) throw new Error(insertErr.message)
        outfitId = (inserted as { id: string }).id
      }

      let coverUrl: string | null = null
      if (coverFile) {
        const ext = getExt(coverFile)
        const path = `${user.id}/outfits/${outfitId}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from(OUTFITS_BUCKET)
          .upload(path, coverFile, { upsert: true })
        if (uploadErr) throw new Error(uploadErr.message)
        const { data: urlData } = supabase.storage.from(OUTFITS_BUCKET).getPublicUrl(path)
        coverUrl = urlData.publicUrl
      }

      if (coverUrl !== null) {
        const { error: coverErr } = await supabase
          .from('outfits')
          .update({ cover_photo_url: coverUrl, updated_at: new Date().toISOString() })
          .eq('id', outfitId)
          .eq('user_id', user.id)
        if (coverErr) throw new Error(coverErr.message)
      }

      const toInsert = OUTFIT_SLOT_TYPES.flatMap((slot, index) => {
        const item = slots[slot]
        if (!item) return []
        return [
          {
            outfit_id: outfitId,
            wardrobe_item_id: item.id,
            slot_type: slot,
            sort_order: index,
          },
        ]
      })
      if (toInsert.length > 0) {
        const { error: itemsErr } = await supabase.from('outfit_items').insert(toInsert)
        if (itemsErr) throw new Error(itemsErr.message)
      }
      setSaveSuccess(true)
      setTimeout(() => navigate('/wardrobe/outfits'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : ru.error)
    } finally {
      setSaving(false)
    }
  }, [user?.id, id, name, notes, slots, coverFile, navigate])

  if (loading) {
    return (
      <main className="main">
        <p className="wardrobe-empty">{ru.loading}</p>
      </main>
    )
  }

  return (
    <main className="main">
      <header className="outfit-builder-header">
        <Link to="/wardrobe/outfits" className="outfit-builder-back">
          ← {ru.backToWardrobe}
        </Link>
        <h1 className="outfit-builder-title">{id ? ru.editOutfit : ru.newOutfit}</h1>
      </header>

      <div className="outfit-builder-form">
        <div className="form-group">
          <label htmlFor="outfit-name">{ru.outfitName}</label>
          <input
            id="outfit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={ru.outfitNamePlaceholder}
          />
        </div>
        <div className="form-group">
          <label htmlFor="outfit-notes">{ru.outfitNotes}</label>
          <textarea
            id="outfit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={ru.outfitNotesPlaceholder}
            rows={2}
          />
        </div>

        <div className="form-group outfit-cover-upload">
          <label className="outfit-cover-upload-label">{ru.outfitCoverPhotoOptional}</label>
          <p className="outfit-cover-upload-hint">{ru.outfitLookImageHint}</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="outfit-cover-upload-input"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setCoverFile(file)
                const url = URL.createObjectURL(file)
                setCoverPreviewUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev)
                  return url
                })
              }
            }}
            aria-label={ru.outfitCoverPhotoOptional}
          />
          {coverPreviewUrl && (
            <div className="outfit-cover-upload-preview">
              <img src={coverPreviewUrl} alt="" />
            </div>
          )}
        </div>

        <h2 className="outfit-builder-slots-title">{ru.assignToSlot}</h2>
        {OUTFIT_SLOT_TYPES.map((slot) => (
          <div key={slot} className="outfit-slot-row">
            <label className="outfit-slot-label">{SLOT_LABELS[slot]}</label>
            <div className="outfit-slot-control">
              <select
                className="outfit-slot-select"
                value={slots[slot]?.id ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  const item = val ? wardrobeItems.find((i) => i.id === val) ?? null : null
                  setSlot(slot, item)
                }}
                aria-label={SLOT_LABELS[slot]}
              >
                <option value="">{ru.noItemInSlot}</option>
                {wardrobeItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.color ? ` (${item.color})` : ''}
                  </option>
                ))}
              </select>
              {slots[slot] && (
                <div className="outfit-slot-preview">
                  {slots[slot]?.photo_url ? (
                    <img
                      src={slots[slot]!.photo_url!}
                      alt=""
                      className="outfit-slot-thumb"
                    />
                  ) : (
                    <div className="outfit-slot-thumb-placeholder" />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {saveSuccess && (
          <p className="outfit-builder-success" role="status">{ru.outfitSavedSuccess}</p>
        )}
        {error && <p className="outfit-builder-error" role="alert">{error}</p>}
        <div className="outfit-builder-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate('/wardrobe/outfits')}
          >
            {ru.cancel}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || saveSuccess}
          >
            {saving ? ru.loading : saveSuccess ? ru.outfitSavedSuccess : ru.saveOutfit}
          </button>
        </div>
      </div>
    </main>
  )
}
