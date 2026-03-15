import type { BeautyRoutine, BeautyRoutineStep } from '../../lib/supabase'
import type { BeautyProduct } from '../../lib/supabase'
import { ru } from '../../constants/ru'

export type StepWithProduct = {
  step: BeautyRoutineStep
  product: BeautyProduct | null
}

const typeLabels: Record<string, string> = {
  morning: ru.routineTypeMorning,
  evening: ru.routineTypeEvening,
  hair: ru.routineTypeHair,
  custom: ru.routineTypeCustom,
}

type BeautyRoutineCardProps = {
  routine: BeautyRoutine
  stepsWithProduct: StepWithProduct[]
  onEdit: (routine: BeautyRoutine) => void
  onDelete: (routine: BeautyRoutine) => void
}

export function BeautyRoutineCard({
  routine,
  stepsWithProduct,
  onEdit,
  onDelete,
}: BeautyRoutineCardProps) {
  const typeLabel = routine.type ? typeLabels[routine.type] ?? routine.type : null

  return (
    <article className="beauty-routine-card">
      <div className="beauty-routine-card__header">
        <h3 className="beauty-routine-card__name">{routine.name}</h3>
        {typeLabel && (
          <span className="beauty-routine-card__type">{typeLabel}</span>
        )}
      </div>
      <ul className="beauty-routine-card__steps" aria-label={ru.routineSteps}>
        {stepsWithProduct.length === 0 ? (
          <li className="beauty-routine-card__step beauty-routine-card__step--empty">
            {ru.noSteps}
          </li>
        ) : (
          stepsWithProduct.map(({ step, product }, index) => (
            <li key={step.id} className="beauty-routine-card__step">
              <span className="beauty-routine-card__step-num">{index + 1}.</span>
              <span className="beauty-routine-card__step-name">
                {product?.name ?? '—'}
              </span>
            </li>
          ))
        )}
      </ul>
      <div className="beauty-routine-card__actions">
        <button
          type="button"
          className="beauty-routine-card__btn beauty-routine-card__btn--edit"
          onClick={() => onEdit(routine)}
          aria-label={ru.editProduct}
        >
          {ru.editProduct}
        </button>
        <button
          type="button"
          className="beauty-routine-card__btn beauty-routine-card__btn--delete"
          onClick={() => onDelete(routine)}
          aria-label={ru.delete}
        >
          {ru.delete}
        </button>
      </div>
    </article>
  )
}
