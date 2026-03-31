import { Pencil, Trash2 } from 'lucide-react'
import type { Vitamin } from '../../lib/supabase'

type Props = {
  vitamin: Vitamin
  onEdit: (v: Vitamin) => void
  onDelete: (v: Vitamin) => void
}

export function VitaminCard({ vitamin, onEdit, onDelete }: Props) {
  const meta = [vitamin.dosage, vitamin.notes, vitamin.is_active ? null : 'На паузе']
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="catalog-card" onClick={() => onEdit(vitamin)}>
      <div className="catalog-card__media">
        <div className="catalog-card__placeholder catalog-card__placeholder--vitamin" aria-hidden />
      </div>

      <div className="catalog-card__body">
        <h3 className="catalog-card__name">{vitamin.name}</h3>
        {meta && <p className="catalog-card__meta">{meta}</p>}
      </div>

      <div className="catalog-card__actions">
        <button
          type="button"
          className="catalog-card__btn catalog-card__btn--edit"
          onClick={(e) => { e.stopPropagation(); onEdit(vitamin) }}
          aria-label="Редактировать"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="catalog-card__btn catalog-card__btn--delete"
          onClick={(e) => { e.stopPropagation(); onDelete(vitamin) }}
          aria-label="Удалить"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  )
}
