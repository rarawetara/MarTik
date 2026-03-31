import { Pencil, Trash2 } from 'lucide-react'
import type { BeautyProduct } from '../../lib/supabase'
import { ru } from '../../constants/ru'
import { PRODUCT_RATING_ROWS } from '../../constants/productRatings'

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

function MiniStars({ value }: { value: number }) {
  return (
    <span className="product-card-stars" aria-label={`${value} из 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`product-card-stars__dot${s <= value ? ' product-card-stars__dot--on' : ''}`} />
      ))}
    </span>
  )
}

type Props = {
  product: BeautyProduct
  onEdit: (product: BeautyProduct) => void
  onDelete: (product: BeautyProduct) => void
}

export function BeautyProductCard({ product, onEdit, onDelete }: Props) {
  const categoryDisplay =
    product.category === 'household' ? ru.productCategoryHousehold : product.category
  const meta = [categoryDisplay, AREA_LABELS[product.area ?? ''], TIME_LABELS[product.time_of_day ?? '']]
    .filter(Boolean)
    .join(' · ')

  const hasRatings = PRODUCT_RATING_ROWS.some(({ key }) => product[key] != null)

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

        {product.price != null && (
          <p className="product-card-price">
            {product.price.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </p>
        )}

        {hasRatings && (
          <div className="product-card-ratings">
            {PRODUCT_RATING_ROWS.map(({ key, label }) =>
              product[key] != null ? (
                <div key={key} className="product-card-rating-row">
                  <span className="product-card-rating-row__label">{label}</span>
                  <MiniStars value={product[key] as number} />
                </div>
              ) : null
            )}
          </div>
        )}
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
