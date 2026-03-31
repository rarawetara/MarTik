import type { BeautyProductRatings } from '../lib/supabase'

/** Порядок отображения в форме и на карточке (только заполненные). */
export const PRODUCT_RATING_ROWS: { key: keyof BeautyProductRatings; label: string }[] = [
  { key: 'rating_black_dots', label: 'От чёрных точек' },
  { key: 'rating_radiance', label: 'Для сияния' },
  { key: 'rating_firmness', label: 'Для упругости' },
  { key: 'rating_even_tone', label: 'Для ровного тона' },
  { key: 'rating_scent', label: 'Запах' },
  { key: 'rating_packaging', label: 'Упаковка' },
  { key: 'rating_appearance', label: 'Внешне' },
]

export function emptyProductRatings(): BeautyProductRatings {
  return {
    rating_black_dots: null,
    rating_radiance: null,
    rating_firmness: null,
    rating_even_tone: null,
    rating_scent: null,
    rating_packaging: null,
    rating_appearance: null,
  }
}

export function ratingsFromProduct(p: Partial<BeautyProductRatings>): BeautyProductRatings {
  const e = emptyProductRatings()
  for (const k of Object.keys(e) as (keyof BeautyProductRatings)[]) {
    e[k] = p[k] ?? null
  }
  return e
}
