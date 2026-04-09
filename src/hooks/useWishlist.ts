import { useCallback, useEffect, useState } from 'react'
import { supabase, BEAUTY_PRODUCTS_BUCKET } from '../lib/supabase'
import type { WishlistItem, WishlistMeta, WishlistTargetKind } from '../lib/supabase'
import { moveWishlistItemToOwned, type MoveWishlistResult } from '../lib/wishlistMove'

function parseRow(row: Record<string, unknown>): WishlistItem {
  return {
    ...row,
    meta: (row.meta && typeof row.meta === 'object' ? row.meta : {}) as WishlistMeta,
  } as WishlistItem
}

export type WishlistFormValues = {
  name: string
  target_kind: WishlistTargetKind
  notes: string
  price: string
  cosmeticsCategory: string
  cosmeticsArea: string
  cosmeticsTime: string
  clothingCategory: string
  clothingColor: string
  clothingSeason: string
  vitaminDosage: string
}

export function buildMetaFromForm(values: WishlistFormValues): WishlistMeta {
  const m: WishlistMeta = {}
  if (values.target_kind === 'cosmetics') {
    m.cosmetics = {
      category: values.cosmeticsCategory || undefined,
      area: values.cosmeticsArea || undefined,
      time_of_day: values.cosmeticsTime || undefined,
    }
  } else if (values.target_kind === 'clothing') {
    m.clothing = {
      category: values.clothingCategory || undefined,
      color: values.clothingColor || undefined,
      season: values.clothingSeason || undefined,
    }
  } else if (values.target_kind === 'vitamin') {
    m.vitamin = { dosage: values.vitaminDosage || undefined }
  }
  return m
}

export function emptyWishlistFormValues(): WishlistFormValues {
  return {
    name: '',
    target_kind: 'cosmetics',
    notes: '',
    price: '',
    cosmeticsCategory: '',
    cosmeticsArea: '',
    cosmeticsTime: '',
    clothingCategory: '',
    clothingColor: '',
    clothingSeason: '',
    vitaminDosage: '',
  }
}

export function valuesFromWishlistItem(item: WishlistItem): WishlistFormValues {
  const mc = item.meta?.cosmetics ?? {}
  const ml = item.meta?.clothing ?? {}
  const mv = item.meta?.vitamin ?? {}
  return {
    name: item.name,
    target_kind: item.target_kind,
    notes: item.notes ?? '',
    price: item.price != null ? String(item.price) : '',
    cosmeticsCategory: mc.category ?? '',
    cosmeticsArea: mc.area ?? '',
    cosmeticsTime: mc.time_of_day ?? '',
    clothingCategory: ml.category ?? '',
    clothingColor: ml.color ?? '',
    clothingSeason: ml.season ?? '',
    vitaminDosage: mv.dosage ?? '',
  }
}

export function useWishlist(userId: string | undefined) {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [movingId, setMovingId] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) {
      console.error('wishlist_items fetch:', error)
      setItems([])
    } else {
      setItems(((data as Record<string, unknown>[]) ?? []).map(parseRow))
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const saveItem = useCallback(
    async (
      values: WishlistFormValues,
      photoFile: File | null,
      existing: WishlistItem | null
    ): Promise<{ ok: boolean; message?: string }> => {
      if (!userId) return { ok: false, message: 'No user' }
      const meta = buildMetaFromForm(values)
      const priceNum = values.price.trim() === '' ? null : parseFloat(values.price.replace(',', '.'))
      const price = priceNum != null && !Number.isNaN(priceNum) ? priceNum : null
      const base = {
        target_kind: values.target_kind,
        name: values.name.trim(),
        notes: values.notes.trim() || null,
        price,
        meta,
        updated_at: new Date().toISOString(),
      }

      if (existing) {
        const { error } = await supabase.from('wishlist_items').update(base).eq('id', existing.id).eq('user_id', userId)
        if (error) return { ok: false, message: error.message }
        let imageUrl = existing.image_url
        if (photoFile) {
          const ext = photoFile.type === 'image/png' ? 'png' : photoFile.type === 'image/webp' ? 'webp' : 'jpg'
          const path = `${userId}/wishlist/${existing.id}.${ext}`
          const { error: upErr } = await supabase.storage.from(BEAUTY_PRODUCTS_BUCKET).upload(path, photoFile, {
            upsert: true,
          })
          if (!upErr) {
            const { data: urlData } = supabase.storage.from(BEAUTY_PRODUCTS_BUCKET).getPublicUrl(path)
            imageUrl = urlData.publicUrl
            await supabase.from('wishlist_items').update({ image_url: imageUrl, updated_at: new Date().toISOString() }).eq('id', existing.id)
          }
        }
        await fetchItems()
        return { ok: true }
      }

      const { data: inserted, error: insErr } = await supabase
        .from('wishlist_items')
        .insert({
          user_id: userId,
          ...base,
          image_url: null,
          sort_order: 0,
        })
        .select('id')
        .single()
      if (insErr || !inserted) return { ok: false, message: insErr?.message ?? 'Insert failed' }
      const id = (inserted as { id: string }).id
      if (photoFile) {
        const ext = photoFile.type === 'image/png' ? 'png' : photoFile.type === 'image/webp' ? 'webp' : 'jpg'
        const path = `${userId}/wishlist/${id}.${ext}`
        const { error: upErr } = await supabase.storage.from(BEAUTY_PRODUCTS_BUCKET).upload(path, photoFile, {
          upsert: true,
        })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from(BEAUTY_PRODUCTS_BUCKET).getPublicUrl(path)
          await supabase
            .from('wishlist_items')
            .update({ image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
            .eq('id', id)
        }
      }
      await fetchItems()
      return { ok: true }
    },
    [userId, fetchItems]
  )

  const deleteItem = useCallback(
    async (item: WishlistItem) => {
      if (!userId) return
      await supabase.from('wishlist_items').delete().eq('id', item.id).eq('user_id', userId)
      const m = item.image_url?.match(/beauty-products\/(.+)$/)
      if (m?.[1]?.includes('/wishlist/')) {
        await supabase.storage.from(BEAUTY_PRODUCTS_BUCKET).remove([m[1]])
      }
      await fetchItems()
    },
    [userId, fetchItems]
  )

  const moveToOwned = useCallback(
    async (item: WishlistItem): Promise<MoveWishlistResult> => {
      setMovingId(item.id)
      const result = await moveWishlistItemToOwned(item)
      setMovingId(null)
      if (result.ok) await fetchItems()
      return result
    },
    [fetchItems]
  )

  return { items, loading, movingId, fetchItems, saveItem, deleteItem, moveToOwned }
}
