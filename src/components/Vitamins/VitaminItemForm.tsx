import { useState } from 'react'
import type { Vitamin } from '../../lib/supabase'
import { ru } from '../../constants/ru'

type Props = {
  vitamin: Vitamin | null
  onSave: (values: { name: string; dosage: string; notes: string; is_active: boolean }) => Promise<void>
  onCancel: () => void
}

export function VitaminItemForm({ vitamin, onSave, onCancel }: Props) {
  const [name, setName] = useState(vitamin?.name ?? '')
  const [dosage, setDosage] = useState(vitamin?.dosage ?? '')
  const [notes, setNotes] = useState(vitamin?.notes ?? '')
  const [isActive, setIsActive] = useState(vitamin?.is_active !== false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Укажите название')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        dosage: dosage.trim(),
        notes: notes.trim(),
        is_active: isActive,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : ru.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="beauty-product-form-overlay" onClick={onCancel}>
      <div className="beauty-product-form" onClick={(e) => e.stopPropagation()}>
        <h2 className="beauty-product-form__title">
          {vitamin ? 'Редактировать витамин' : 'Добавить витамин'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="vit-name">Название</label>
            <input
              id="vit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, витамин D, омега-3"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="vit-dosage">Дозировка</label>
            <input
              id="vit-dosage"
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="1 капсула, 1000 IU…"
            />
          </div>
          <div className="form-group">
            <label htmlFor="vit-notes">{ru.productNotes}</label>
            <textarea
              id="vit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={ru.productNotesPlaceholder}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label className="vitamin-item-form__active">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span>Показывать в «Сегодня»</span>
            </label>
          </div>
          {error && <p className="beauty-product-form__error" role="alert">{error}</p>}
          <div className="beauty-product-form__actions">
            <button type="button" className="btn-ghost" onClick={onCancel}>
              {ru.cancel}
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? ru.loading : ru.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
