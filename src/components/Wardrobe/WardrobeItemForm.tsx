import { useState, useRef } from 'react'
import type { WardrobeItem } from '../../lib/supabase'
import { ru } from '../../constants/ru'

export type WardrobeItemFormValues = {
  name: string
  category: string
  color: string
  season: string
  notes: string
}

type WardrobeItemFormProps = {
  item: WardrobeItem | null
  onSave: (values: WardrobeItemFormValues, photoFile: File | null) => Promise<void>
  onCancel: () => void
}

const CATEGORY_OPTIONS = [
  { value: '', label: ru.wardrobeCategoryPlaceholder },
  { value: 'top', label: ru.wardrobeCategoryTop },
  { value: 'bottom', label: ru.wardrobeCategoryBottom },
  { value: 'dress', label: ru.wardrobeCategoryDress },
  { value: 'shoes', label: ru.wardrobeCategoryShoes },
  { value: 'accessory', label: ru.wardrobeCategoryAccessory },
]

const SEASON_OPTIONS = [
  { value: '', label: 'Все сезоны' },
  { value: 'spring', label: 'Весна' },
  { value: 'summer', label: 'Лето' },
  { value: 'autumn', label: 'Осень' },
  { value: 'winter', label: 'Зима' },
]

const defaultValues: WardrobeItemFormValues = {
  name: '',
  category: '',
  color: '',
  season: '',
  notes: '',
}

export function WardrobeItemForm({ item, onSave, onCancel }: WardrobeItemFormProps) {
  const [values, setValues] = useState<WardrobeItemFormValues>(
    item
      ? {
          name: item.name,
          category: item.category ?? '',
          color: item.color ?? '',
          season: item.season ?? '',
          notes: item.notes ?? '',
        }
      : defaultValues
  )
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(item?.photo_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (field: keyof WardrobeItemFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }))
    setError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError(ru.wardrobePhotoInvalidType)
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.name.trim()) {
      setError(ru.wardrobeNameRequired)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(values, photoFile)
    } catch (err) {
      setError(err instanceof Error ? err.message : ru.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="wardrobe-item-form-overlay" onClick={onCancel}>
      <div className="wardrobe-item-form" onClick={(e) => e.stopPropagation()}>
        <h2 className="wardrobe-item-form__title">
          {item ? ru.wardrobeEditItem : ru.wardrobeAddItem}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{ru.wardrobePhoto}</label>
            <div className="wardrobe-item-form__photo">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt=""
                  className="wardrobe-item-form__preview"
                />
              ) : (
                <div className="wardrobe-item-form__photo-placeholder" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="wardrobe-item-form__file-input"
                aria-label={ru.wardrobePhotoAdd}
              />
              <button
                type="button"
                className="btn-ghost wardrobe-item-form__photo-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                {ru.wardrobePhotoAdd}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="wardrobe-item-name">{ru.wardrobeItemName}</label>
            <input
              id="wardrobe-item-name"
              type="text"
              value={values.name}
              onChange={handleChange('name')}
              placeholder={ru.wardrobeItemNamePlaceholder}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="wardrobe-item-category">{ru.wardrobeCategory}</label>
            <select
              id="wardrobe-item-category"
              value={values.category}
              onChange={handleChange('category')}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value || 'empty'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="wardrobe-item-color">{ru.wardrobeColor}</label>
            <input
              id="wardrobe-item-color"
              type="text"
              value={values.color}
              onChange={handleChange('color')}
              placeholder={ru.wardrobeColorPlaceholder}
            />
          </div>
          <div className="form-group">
            <label htmlFor="wardrobe-item-season">{ru.wardrobeSeason}</label>
            <select
              id="wardrobe-item-season"
              value={values.season}
              onChange={handleChange('season')}
            >
              {SEASON_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="wardrobe-item-notes">{ru.wardrobeNotes}</label>
            <textarea
              id="wardrobe-item-notes"
              value={values.notes}
              onChange={handleChange('notes')}
              placeholder={ru.wardrobeNotesPlaceholder}
              rows={3}
            />
          </div>
          {error && (
            <p className="wardrobe-item-form__error" role="alert">
              {error}
            </p>
          )}
          <div className="wardrobe-item-form__actions">
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
