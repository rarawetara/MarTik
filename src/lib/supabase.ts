import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey)

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
  created_at: string
  updated_at: string
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
  sort_order: number
  created_at: string
  updated_at: string
}

export type BeautyRoutine = {
  id: string
  user_id: string
  name: string
  type: string | null
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

export const BEAUTY_PRODUCTS_BUCKET = 'beauty-products'
export const BEAUTY_PROGRESS_BUCKET = 'beauty-progress'
