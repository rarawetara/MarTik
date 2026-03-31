import { useState } from 'react'
import { useVitamins } from '../../hooks/useVitamins'
import type { Vitamin } from '../../lib/supabase'
import { ru } from '../../constants/ru'
import { VitaminCard } from './VitaminCard'
import { VitaminItemForm } from './VitaminItemForm'

export function VitaminTracker() {
  const { vitamins, loading, add, update, remove } = useVitamins()
  const [formVitamin, setFormVitamin] = useState<Vitamin | null | 'new'>(null)

  const handleSave = async (values: {
    name: string
    dosage: string
    notes: string
    is_active: boolean
  }) => {
    if (formVitamin === 'new' || formVitamin === null) {
      await add(values.name, values.dosage, values.notes, values.is_active)
    } else {
      await update(formVitamin.id, {
        name: values.name,
        dosage: values.dosage || null,
        notes: values.notes || null,
        is_active: values.is_active,
      })
    }
    setFormVitamin(null)
  }

  const handleDelete = async (v: Vitamin) => {
    if (!window.confirm(`Удалить «${v.name}»?`)) return
    await remove(v.id)
  }

  if (loading) {
    return <p className="empty-state">{ru.loading}</p>
  }

  return (
    <>
      <div className="catalog-toolbar">
        <div className="catalog-toolbar__filters" />
        <div className="catalog-toolbar__actions">
          <button type="button" className="btn-primary" onClick={() => setFormVitamin('new')}>
            Добавить витамин
          </button>
        </div>
      </div>

      {vitamins.length === 0 ? (
        <div className="catalog-empty">
          <div className="catalog-empty__shape" />
          Нет витаминов — добавь первый
        </div>
      ) : (
        <div className="catalog-grid">
          {vitamins.map((v) => (
            <VitaminCard key={v.id} vitamin={v} onEdit={setFormVitamin} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {formVitamin != null && (
        <VitaminItemForm
          vitamin={formVitamin === 'new' ? null : formVitamin}
          onSave={handleSave}
          onCancel={() => setFormVitamin(null)}
        />
      )}
    </>
  )
}
