import { Pencil, Trash2, ShoppingBag } from 'lucide-react'
import type { WishlistItem, WishlistTargetKind } from '../../lib/supabase'
import { ru } from '../../constants/ru'

const COSMETICS_CAT_LABEL: Record<string, string> = {
  cleanser: ru.productCategoryCleanser,
  toner: ru.productCategoryToner,
  serum: ru.productCategorySerum,
  moisturizer: ru.productCategoryMoisturizer,
  sunscreen: ru.productCategorySunscreen,
  mask: ru.productCategoryMask,
  hair: ru.productCategoryHair,
  other: ru.productCategoryOther,
  household: ru.productCategoryHousehold,
}

const COSMETICS_AREA_LABEL: Record<string, string> = {
  face: ru.productAreaFace,
  hair: ru.productAreaHair,
  body: ru.productAreaBody,
}

const COSMETICS_TIME_LABEL: Record<string, string> = {
  morning: ru.productTimeMorning,
  evening: ru.productTimeEvening,
  anytime: ru.productTimeAnytime,
}

const CLOTHING_CAT_LABEL: Record<string, string> = {
  top: ru.wardrobeCategoryTop,
  bottom: ru.wardrobeCategoryBottom,
  dress: ru.wardrobeCategoryDress,
  shoes: ru.wardrobeCategoryShoes,
  accessory: ru.wardrobeCategoryAccessory,
}

const SEASON_LABEL: Record<string, string> = {
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
  winter: 'Зима',
}

const KIND_LABELS: Record<WishlistTargetKind, string> = {
  cosmetics: ru.wishlistKindCosmetics,
  clothing: ru.wishlistKindClothing,
  vitamin: ru.wishlistKindVitamin,
  product: ru.wishlistKindProduct,
}

function metaLine(item: WishlistItem): string {
  const m = item.meta ?? {}
  if (item.target_kind === 'cosmetics' && m.cosmetics) {
    const c = m.cosmetics
    const cat = c.category ? COSMETICS_CAT_LABEL[c.category] ?? c.category : ''
    const ar = c.area ? COSMETICS_AREA_LABEL[c.area] ?? c.area : ''
    const tm = c.time_of_day ? COSMETICS_TIME_LABEL[c.time_of_day] ?? c.time_of_day : ''
    return [cat, ar, tm].filter(Boolean).join(' · ')
  }
  if (item.target_kind === 'clothing' && m.clothing) {
    const c = m.clothing
    const cat = c.category ? CLOTHING_CAT_LABEL[c.category] ?? c.category : ''
    const sn = c.season ? SEASON_LABEL[c.season] ?? c.season : ''
    return [cat, c.color, sn].filter(Boolean).join(' · ')
  }
  if (item.target_kind === 'vitamin' && m.vitamin?.dosage) {
    return m.vitamin.dosage
  }
  return ''
}

type Props = {
  item: WishlistItem
  onEdit: (item: WishlistItem) => void
  onDelete: (item: WishlistItem) => void
  onMarkOwned: (item: WishlistItem) => void
  moving: boolean
}

export function WishlistItemCard({ item, onEdit, onDelete, onMarkOwned, moving }: Props) {
  const extra = metaLine(item)
  const kindLabel = KIND_LABELS[item.target_kind]

  return (
    <article className="catalog-card wishlist-card" onClick={() => onEdit(item)}>
      <div className="catalog-card__media">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="catalog-card__img" />
        ) : (
          <div className="catalog-card__placeholder" aria-hidden />
        )}
      </div>

      <div className="catalog-card__body">
        <span className="wishlist-card__badge">{kindLabel}</span>
        <h3 className="catalog-card__name">{item.name}</h3>
        {extra ? <p className="catalog-card__meta">{extra}</p> : null}
        {item.price != null && (
          <p className="product-card-price">
            {item.price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </p>
        )}
        {item.notes ? <p className="wishlist-card__notes">{item.notes}</p> : null}

        <div className="wishlist-card__cta">
          <button
            type="button"
            className="btn-primary wishlist-card__own-btn"
            disabled={moving}
            onClick={(e) => {
              e.stopPropagation()
              onMarkOwned(item)
            }}
          >
            <ShoppingBag size={16} strokeWidth={1.75} aria-hidden />
            {moving ? ru.loading : ru.wishlistMarkOwned}
          </button>
        </div>
      </div>

      <div className="catalog-card__actions">
        <button
          type="button"
          className="catalog-card__btn catalog-card__btn--edit"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(item)
          }}
          aria-label={ru.wishlistEdit}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="catalog-card__btn catalog-card__btn--delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item)
          }}
          aria-label={ru.delete}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  )
}
