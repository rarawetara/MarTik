import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useVitamins, useVitaminLogs } from '../../hooks/useVitamins'

type Variant = 'dashboard' | 'embedded'

type Props = {
  date: string
  userId: string
  disabled?: boolean
  variant?: Variant
  /** Parent supplies the title (e.g. card h3); show list + footer only */
  hideHeader?: boolean
}

export function VitaminDayChecklist({
  date,
  userId,
  disabled = false,
  variant = 'dashboard',
  hideHeader = false,
}: Props) {
  const { vitamins, loading } = useVitamins()
  const { logs, toggle } = useVitaminLogs(date, date)

  const active = vitamins.filter((v) => v.is_active)
  const takenIds = new Set(logs.map((l) => l.vitamin_id))
  const takenCount = active.filter((v) => takenIds.has(v.id)).length

  const isDash = variant === 'dashboard'
  const HeadTag = isDash ? 'h3' : 'h4'
  const headClass = isDash ? 'dashboard-card-title' : 'beauty-today-vitamins__title'

  const header = (
    <div className={isDash ? 'tl-header' : 'beauty-today-vitamins__head'}>
      <HeadTag className={headClass}>Витамины</HeadTag>
      {!loading && active.length > 0 && (
        <span className="tl-progress">{takenCount}/{active.length}</span>
      )}
    </div>
  )

  let body: ReactNode
  if (loading) {
    body = <p className="empty-state">Загрузка...</p>
  } else if (active.length === 0) {
    body = (
      <p className="empty-state beauty-today-vitamins__empty">
        {isDash
          ? 'Добавь витамины в разделе «Красота → Витамины»'
          : 'Пока нет витаминов — добавь в Красоте'}
      </p>
    )
  } else {
    body = (
      <ul className="task-list beauty-today-vitamins__list">
        {active.map((vitamin) => {
          const taken = takenIds.has(vitamin.id)
          return (
            <li key={vitamin.id} className={`task-item${taken ? ' done' : ''}`}>
              <input
                type="checkbox"
                checked={taken}
                disabled={disabled}
                onChange={() => toggle(vitamin.id, date, userId)}
                aria-label={vitamin.name}
              />
              <span className="task-item__title">
                {vitamin.name}
                {vitamin.dosage && <span className="task-item__cat-badge">{vitamin.dosage}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  if (hideHeader) {
    return (
      <>
        {!loading && active.length > 0 && (
          <p className="beauty-today-vitamins__card-progress">{takenCount}/{active.length}</p>
        )}
        {body}
        <p className="beauty-today-vitamins__footer page-footer-link">
          <Link to="/beauty?tab=vitamins" className="link-text">
            Витамины в Красоте →
          </Link>
        </p>
      </>
    )
  }

  if (isDash) {
    return (
      <>
        {header}
        {body}
      </>
    )
  }

  return (
    <section className="beauty-today-vitamins">
      {header}
      {body}
      <p className="beauty-today-vitamins__footer page-footer-link">
        <Link to="/beauty?tab=vitamins" className="link-text">
          Витамины в Красоте →
        </Link>
      </p>
    </section>
  )
}
