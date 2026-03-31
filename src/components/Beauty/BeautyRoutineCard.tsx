import { useState } from 'react'
import { ChevronRight, Pencil, Trash2 } from 'lucide-react'
import type { BeautyRoutine, BeautyRoutineStep, BeautyProduct } from '../../lib/supabase'
import { ru } from '../../constants/ru'
import { BeautyProductCard } from './BeautyProductCard'

export type StepWithProduct = {
  step: BeautyRoutineStep
  product: BeautyProduct | null
}

const TYPE_LABELS: Record<string, string> = {
  morning: ru.routineTypeMorning,
  evening: ru.routineTypeEvening,
  hair: ru.routineTypeHair,
  custom: ru.routineTypeCustom,
}

function InlineStarRating({
  value,
  onChange,
  busy,
}: {
  value: number | null
  onChange: (v: number | null) => void
  busy?: boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const displayed = hovered ?? value ?? 0

  return (
    <div
      className="beauty-routine-inline-stars"
      role="group"
      aria-label={ru.routineRating}
      onClick={(e) => e.stopPropagation()}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={busy}
          className={`beauty-routine-inline-stars__btn${displayed >= star ? ' beauty-routine-inline-stars__btn--on' : ''}`}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(value === star ? null : star)}
          aria-label={`${star} из 5`}
        >
          ★
        </button>
      ))}
      {value !== null && (
        <button
          type="button"
          className="beauty-routine-inline-stars__clear"
          disabled={busy}
          onClick={() => onChange(null)}
          aria-label="Сбросить оценку"
        >
          ×
        </button>
      )}
    </div>
  )
}

type Props = {
  routine: BeautyRoutine
  stepsWithProduct: StepWithProduct[]
  onEdit: (routine: BeautyRoutine) => void
  onDelete: (routine: BeautyRoutine) => void
  onRoutineRatingChange: (routineId: string, rating: number | null) => Promise<void>
  onProductEdit: (product: BeautyProduct) => void
  onProductDelete: (product: BeautyProduct) => void
}

export function BeautyRoutineCard({
  routine,
  stepsWithProduct,
  onEdit,
  onDelete,
  onRoutineRatingChange,
  onProductEdit,
  onProductDelete,
}: Props) {
  const [open, setOpen] = useState(false)
  const [ratingBusy, setRatingBusy] = useState(false)
  const typeLabel = routine.type ? TYPE_LABELS[routine.type] ?? routine.type : null

  const handleRating = async (v: number | null) => {
    setRatingBusy(true)
    try {
      await onRoutineRatingChange(routine.id, v)
    } finally {
      setRatingBusy(false)
    }
  }

  return (
    <div className={`beauty-routine-item${open ? ' beauty-routine-item--open' : ''}`}>
      <div className="beauty-routine-row">
        <button
          type="button"
          className="beauty-routine-row__expand"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={`routine-steps-${routine.id}`}
        >
          <ChevronRight
            size={18}
            className={`beauty-routine-row__chevron${open ? ' beauty-routine-row__chevron--open' : ''}`}
            aria-hidden
          />
          <span className="beauty-routine-row__title">{routine.name}</span>
          {typeLabel && <span className="beauty-routine-row__tag">{typeLabel}</span>}
          <span className="beauty-routine-row__count" aria-hidden>
            {stepsWithProduct.length}
          </span>
        </button>

        <div className="beauty-routine-row__rating">
          <InlineStarRating value={routine.rating ?? null} onChange={handleRating} busy={ratingBusy} />
        </div>

        <div className="beauty-routine-row__actions">
          <button
            type="button"
            className="catalog-card__btn"
            onClick={() => onEdit(routine)}
            aria-label={ru.editProduct}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="catalog-card__btn catalog-card__btn--delete"
            onClick={() => onDelete(routine)}
            aria-label={ru.delete}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div id={`routine-steps-${routine.id}`} className="beauty-routine-expand">
          {stepsWithProduct.length === 0 ? (
            <p className="beauty-routine-expand__empty">{ru.noSteps}</p>
          ) : stepsWithProduct.every((s) => !s.product) ? (
            <p className="beauty-routine-expand__empty">{ru.noSteps}</p>
          ) : (
            <div className="catalog-grid beauty-routine-expand__grid">
              {stepsWithProduct.map(({ step, product }) =>
                product ? (
                  <BeautyProductCard
                    key={step.id}
                    product={product}
                    onEdit={onProductEdit}
                    onDelete={onProductDelete}
                  />
                ) : null
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
