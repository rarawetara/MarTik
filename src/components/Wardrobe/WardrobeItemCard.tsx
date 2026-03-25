import { Pencil, Trash2 } from 'lucide-react'
import type { WardrobeItem } from '../../lib/supabase'
import { ru } from '../../constants/ru'

const CATEGORY_LABELS: Record<string, string> = {
  top: ru.wardrobeCategoryTop,
  bottom: ru.wardrobeCategoryBottom,
  dress: ru.wardrobeCategoryDress,
  shoes: ru.wardrobeCategoryShoes,
  accessory: ru.wardrobeCategoryAccessory,
}

const SEASON_LABELS: Record<string, string> = {
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
  winter: 'Зима',
}

type Props = {
  item: WardrobeItem
  onEdit: (item: WardrobeItem) => void
  onDelete: (item: WardrobeItem) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export function WardrobeItemCard({
  item,
  onEdit,
  onDelete,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const meta = [
    CATEGORY_LABELS[item.category ?? ''],
    SEASON_LABELS[item.season ?? ''],
    item.color,
  ]
    .filter(Boolean)
    .join(' · ')

  const handleClick = () =>
    selectMode && onToggleSelect ? onToggleSelect(item.id) : onEdit(item)

  return (
    <article
      className={`catalog-card${selected ? ' catalog-card--selected' : ''}`}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="catalog-card__media">
        {item.photo_url ? (
          <img src={item.photo_url} alt="" className="catalog-card__img" />
        ) : (
          <div className="catalog-card__placeholder" aria-hidden />
        )}

        {selectMode && (
          <div className={`catalog-card__check${selected ? ' catalog-card__check--active' : ''}`}>
            {selected ? '✓' : ''}
          </div>
        )}
      </div>

      <div className="catalog-card__body">
        <h3 className="catalog-card__name">{item.name}</h3>
        {meta && <p className="catalog-card__meta">{meta}</p>}
      </div>

      {!selectMode && (
        <div className="catalog-card__actions">
          <button
            type="button"
            className="catalog-card__btn catalog-card__btn--edit"
            onClick={(e) => { e.stopPropagation(); onEdit(item) }}
            aria-label={ru.wardrobeEditItem}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="catalog-card__btn catalog-card__btn--delete"
            onClick={(e) => { e.stopPropagation(); onDelete(item) }}
            aria-label={ru.delete}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </article>
  )
}
