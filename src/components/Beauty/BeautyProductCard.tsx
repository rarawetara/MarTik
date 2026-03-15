import type { BeautyProduct } from '../../lib/supabase'
import { ru } from '../../constants/ru'

type BeautyProductCardProps = {
  product: BeautyProduct
  onEdit: (product: BeautyProduct) => void
  onDelete: (product: BeautyProduct) => void
}

const areaLabels: Record<string, string> = {
  face: ru.productAreaFace,
  hair: ru.productAreaHair,
  body: ru.productAreaBody,
}

const timeLabels: Record<string, string> = {
  morning: ru.productTimeMorning,
  evening: ru.productTimeEvening,
  anytime: ru.productTimeAnytime,
}

export function BeautyProductCard({ product, onEdit, onDelete }: BeautyProductCardProps) {
  const areaLabel = product.area ? areaLabels[product.area] ?? product.area : null
  const timeLabel = product.time_of_day ? timeLabels[product.time_of_day] ?? product.time_of_day : null
  const subtitle = [product.category, areaLabel, timeLabel].filter(Boolean).join(' · ')

  return (
    <article className="beauty-product-card" onClick={() => onEdit(product)}>
      <div className="beauty-product-card__image-wrap">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="beauty-product-card__image"
          />
        ) : (
          <div className="beauty-product-card__placeholder" aria-hidden />
        )}
      </div>
      <div className="beauty-product-card__body">
        <h3 className="beauty-product-card__name">{product.name}</h3>
        {subtitle && <p className="beauty-product-card__meta">{subtitle}</p>}
      </div>
      <div className="beauty-product-card__actions">
        <button
          type="button"
          className="beauty-product-card__btn beauty-product-card__btn--edit"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(product)
          }}
          aria-label={ru.editProduct}
        >
          {ru.editProduct}
        </button>
        <button
          type="button"
          className="beauty-product-card__btn beauty-product-card__btn--delete"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(product)
          }}
          aria-label={ru.delete}
        >
          {ru.delete}
        </button>
      </div>
    </article>
  )
}
