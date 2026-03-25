import { Pencil, Trash2 } from 'lucide-react'
import type { BeautyRoutine, BeautyRoutineStep, BeautyProduct } from '../../lib/supabase'
import { ru } from '../../constants/ru'

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

type Props = {
  routine: BeautyRoutine
  stepsWithProduct: StepWithProduct[]
  onEdit: (routine: BeautyRoutine) => void
  onDelete: (routine: BeautyRoutine) => void
}

export function BeautyRoutineCard({ routine, stepsWithProduct, onEdit, onDelete }: Props) {
  const typeLabel = routine.type ? TYPE_LABELS[routine.type] ?? routine.type : null

  return (
    <article className="catalog-card catalog-card--row">
      <div className="catalog-card__body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h3 className="catalog-card__name">{routine.name}</h3>
          {typeLabel && <span className="catalog-card__tag">{typeLabel}</span>}
        </div>

        <ul className="catalog-card__steps" aria-label={ru.routineSteps}>
          {stepsWithProduct.length === 0 ? (
            <li className="catalog-card__step catalog-card__step--empty">{ru.noSteps}</li>
          ) : (
            stepsWithProduct.map(({ step, product }) => (
              <li key={step.id} className="catalog-card__step">
                {product?.name ?? '—'}
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="catalog-card__actions">
        <button
          type="button"
          className="catalog-card__btn catalog-card__btn--edit"
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
    </article>
  )
}
