import { useAuth } from '../../hooks/useAuth'
import { VitaminDayChecklist } from './VitaminDayChecklist'

type Props = {
  date: string
  disabled?: boolean
}

/** Отдельная карточка витаминов (если понадобится вне «Ухода»). */
export function VitaminWidget({ date, disabled = false }: Props) {
  const { user } = useAuth()
  if (!user) {
    return (
      <div className="dashboard-card">
        <h3 className="dashboard-card-title">Витамины</h3>
        <p className="empty-state">Войдите, чтобы отмечать приём</p>
      </div>
    )
  }

  return (
    <div className="dashboard-card">
      <VitaminDayChecklist date={date} userId={user.id} disabled={disabled} variant="dashboard" />
    </div>
  )
}
