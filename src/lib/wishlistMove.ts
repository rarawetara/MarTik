import { supabase } from './supabase'
import { BEAUTY_PRODUCTS_BUCKET } from './supabase'
import type { WishlistItem } from './supabase'
import { emptyProductRatings } from '../constants/productRatings'

function normalizeMeta(raw: unknown): WishlistItem['meta'] {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as WishlistItem['meta']
  return {}
}

/** Strip wishlist photo from storage after successful move (best-effort). */
async function removeWishlistImageIfStored(imageUrl: string | null) {
  if (!imageUrl) return
  const m = imageUrl.match(/beauty-products\/(.+)$/)
  if (!m) return
  const path = m[1]
  if (!path.includes('/wishlist/')) return
  await supabase.storage.from(BEAUTY_PRODUCTS_BUCKET).remove([path])
}

export type MoveWishlistResult = { ok: true } | { ok: false; message: string }

/**
 * Creates the real row (cosmetics / wardrobe / vitamin / general product) and deletes the wishlist item.
 */
export async function moveWishlistItemToOwned(item: WishlistItem): Promise<MoveWishlistResult> {
  const userId = item.user_id
  const meta = normalizeMeta(item.meta)
  const now = new Date().toISOString()
  const ratings = emptyProductRatings()

  try {
    if (item.target_kind === 'cosmetics') {
      const c = meta.cosmetics ?? {}
      const { error } = await supabase.from('beauty_products').insert({
        user_id: userId,
        name: item.name.trim(),
        category: c.category?.trim() || null,
        area: c.area?.trim() || null,
        time_of_day: c.time_of_day?.trim() || null,
        notes: item.notes?.trim() || null,
        price: item.price,
        image_url: item.image_url,
        sort_order: 0,
        updated_at: now,
        ...ratings,
      })
      if (error) return { ok: false, message: error.message }
    } else if (item.target_kind === 'product') {
      const { error } = await supabase.from('beauty_products').insert({
        user_id: userId,
        name: item.name.trim(),
        category: 'household',
        area: null,
        time_of_day: null,
        notes: item.notes?.trim() || null,
        price: item.price,
        image_url: item.image_url,
        sort_order: 0,
        updated_at: now,
        ...ratings,
      })
      if (error) return { ok: false, message: error.message }
    } else if (item.target_kind === 'clothing') {
      const c = meta.clothing ?? {}
      let notes = item.notes?.trim() || null
      if (item.price != null) {
        const priceLine = `Цена (из вишлиста): ${item.price}`
        notes = notes ? `${notes}\n${priceLine}` : priceLine
      }
      const { error } = await supabase.from('wardrobe_items').insert({
        user_id: userId,
        name: item.name.trim(),
        category: c.category?.trim() || null,
        color: c.color?.trim() || null,
        season: c.season?.trim() || null,
        notes,
        photo_url: item.image_url,
        sort_order: 0,
        updated_at: now,
      })
      if (error) return { ok: false, message: error.message }
    } else if (item.target_kind === 'vitamin') {
      const v = meta.vitamin ?? {}
      let notes = item.notes?.trim() || null
      if (item.image_url) {
        const line = `Фото: ${item.image_url}`
        notes = notes ? `${notes}\n${line}` : line
      }
      const { error } = await supabase.from('vitamins').insert({
        user_id: userId,
        name: item.name.trim(),
        dosage: v.dosage?.trim() || null,
        notes,
        is_active: true,
        sort_order: 0,
        updated_at: now,
      })
      if (error) return { ok: false, message: error.message }
    } else {
      return { ok: false, message: 'Unknown target' }
    }

    const { error: delErr } = await supabase.from('wishlist_items').delete().eq('id', item.id).eq('user_id', userId)
    if (delErr) return { ok: false, message: delErr.message }

    await removeWishlistImageIfStored(item.image_url)
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return { ok: false, message: msg }
  }
}
