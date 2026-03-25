import { Pencil, Trash2 } from 'lucide-react'
import type { BeautyProduct } from '../../lib/supabase'
import { ru } from '../../constants/ru'

const AREA_LABELS: Record<string, string> = {
  face: ru.productAreaFace,
  hair: ru.productAreaHair,
  body: ru.productAreaBody,
}

const TIME_LABELS: Record<string, string> = {
  morning: ru.productTimeMorning,
  evening: ru.productTimeEvening,
  anytime: ru.productTimeAnytime,
}

type Props = {
  product: BeautyProduct
  onEdit: (product: BeautyProduct) => void
  onDelete: (product: BeautyProduct) => void
}

export function BeautyProductCard({ product, onEdit, onDelete }: Props) {
  const meta = [product.category, AREA_LABELS[product.area ?? ''], TIME_LABELS[product.time_of_day ?? '']]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="catalog-card" onClick={() => onEdit(product)}>
      <div className="catalog-card__media">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="catalog-card__img" />
        ) : (
          <div className="catalog-card__placeholder" aria-hidden />
        )}
      </div>

      <div className="catalog-card__body">
        <h3 className="catalog-card__name">{product.name}</h3>
        {meta && <p className="catalog-card__meta">{meta}</p>}
      </div>

      <div className="catalog-card__actions">
        <button
          type="button"
          className="catalog-card__btn catalog-card__btn--edit"
          onClick={(e) => { e.stopPropagation(); onEdit(product) }}
          aria-label={ru.editProduct}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="catalog-card__btn catalog-card__btn--delete"
          onClick={(e) => { e.stopPropagation(); onDelete(product) }}
          aria-label={ru.delete}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  )
}
