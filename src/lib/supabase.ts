import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from './supabaseEnv'

const { url, anonKey, ok } = getSupabaseEnv()

if (!ok) {
  throw new Error('Missing or invalid VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey, {
  global: {
    headers: {
      apikey: anonKey,
    },
  },
})

export type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  water_goal_ml: number
  timezone: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type DailyEntry = {
  id: string
  user_id: string
  entry_date: string
  journal_text: string | null
  mood: string | null
  water_ml: number
  daily_photos: unknown[]
  progress_photos: unknown[]
  habits: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type DailyTask = {
  id: string
  user_id: string
  daily_entry_id: string
  title: string
  completed: boolean
  sort_order: number
  template_id: string | null
  category?: string | null
  carried_over?: boolean
  created_at: string
  updated_at: string
}

export type TaskCategory = {
  id: string
  user_id: string
  name: string
  sort_order: number
  created_at: string
}

export type TaskTemplate = {
  id: string
  user_id: string
  title: string
  recurrence_type: 'daily' | 'weekly' | 'weekdays' | 'weekends' | 'persistent'
  recurrence_days: number[] | null
  is_active: boolean
  category?: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/** 1–5 star ratings on beauty products (null = not set). */
export type BeautyProductRatings = {
  rating_black_dots: number | null
  rating_radiance: number | null
  rating_firmness: number | null
  rating_even_tone: number | null
  rating_scent: number | null
  rating_packaging: number | null
  rating_appearance: number | null
}

export type BeautyProduct = {
  id: string
  user_id: string
  name: string
  category: string | null
  area: string | null
  time_of_day: string | null
  notes: string | null
  image_url: string | null
  price: number | null
} & BeautyProductRatings & {
  sort_order: number
  created_at: string
  updated_at: string
}

export type BeautyRoutine = {
  id: string
  user_id: string
  name: string
  type: string | null
  /** 1–5, optional — overall satisfaction with the routine (column: run migration) */
  rating?: number | null
  sort_order: number
  created_at: string
  updated_at: string
  cadence_type?: 'daily' | 'weekly' | 'monthly' | 'none'
  weekly_days?: number[] | null
  monthly_days?: number[] | null
  is_active?: boolean
}

export type BeautyRoutineStep = {
  id: string
  routine_id: string
  product_id: string
  sort_order: number
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type BeautyLog = {
  id: string
  daily_entry_id: string
  routine_step_id: string
  completed_at: string
}

export type BeautyProgressPhoto = {
  id: string
  user_id: string
  daily_entry_id: string
  area: string
  photo_url: string
  notes: string | null
  note_category?: string | null
  taken_at: string
  created_at: string
  updated_at: string
  routine_id?: string | null
  face_condition_rating?: string | null
  hair_quality_rating?: string | null
  hair_length_feeling_rating?: string | null
}

export const PROGRESS_RATING_VALUES = ['low', 'medium', 'good', 'great'] as const
export type ProgressRatingValue = (typeof PROGRESS_RATING_VALUES)[number]

export type Vitamin = {
  id: string
  user_id: string
  name: string
  dosage: string | null
  notes: string | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type VitaminLog = {
  id: string
  user_id: string
  vitamin_id: string
  log_date: string   // YYYY-MM-DD
  created_at: string
}

export const WISHLIST_TARGET_KINDS = ['cosmetics', 'clothing', 'vitamin', 'product'] as const
export type WishlistTargetKind = (typeof WISHLIST_TARGET_KINDS)[number]

/** Optional fields used when moving into the real catalog. */
export type WishlistMeta = {
  cosmetics?: { category?: string; area?: string; time_of_day?: string }
  clothing?: { category?: string; color?: string; season?: string }
  vitamin?: { dosage?: string }
}

export type WishlistItem = {
  id: string
  user_id: string
  target_kind: WishlistTargetKind
  name: string
  notes: string | null
  image_url: string | null
  price: number | null
  meta: WishlistMeta
  sort_order: number
  created_at: string
  updated_at: string
}

export const BEAUTY_PRODUCTS_BUCKET = 'beauty-products'
export const BEAUTY_PROGRESS_BUCKET = 'beauty-progress'
export const WARDROBE_BUCKET = 'wardrobe'
export const OUTFITS_BUCKET = 'outfits'

export type WardrobeItem = {
  id: string
  user_id: string
  name: string
  category: string | null
  color: string | null
  season: string | null
  notes: string | null
  photo_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export const OUTFIT_SLOT_TYPES = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'] as const
export type OutfitSlotType = (typeof OUTFIT_SLOT_TYPES)[number]

export type Outfit = {
  id: string
  user_id: string
  name: string
  notes: string | null
  cover_photo_url: string | null
  created_at: string
  updated_at: string
}

export type OutfitItem = {
  id: string
  outfit_id: string
  wardrobe_item_id: string
  slot_type: string
  sort_order: number
  created_at: string
}

export const PLANNED_OUTFIT_STATUSES = ['planned', 'worn', 'skipped'] as const
export type PlannedOutfitStatus = (typeof PLANNED_OUTFIT_STATUSES)[number]

export type PlannedOutfit = {
  id: string
  user_id: string
  outfit_id: string
  planned_date: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}
