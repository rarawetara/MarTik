import { useState, useRef } from 'react'
import type { BeautyProduct, BeautyProductRatings } from '../../lib/supabase'
import { ru } from '../../constants/ru'
import { PRODUCT_RATING_ROWS, emptyProductRatings, ratingsFromProduct } from '../../constants/productRatings'

export type BeautyProductFormValues = {
  name: string
  category: string
  area: string
  time_of_day: string
  notes: string
  price: string
} & BeautyProductRatings

type BeautyProductFormProps = {
  product: BeautyProduct | null
  onSave: (values: BeautyProductFormValues, photoFile: File | null) => Promise<void>
  onCancel: () => void
}

const CATEGORY_OPTIONS = [
  { value: '', label: ru.productCategoryPlaceholder },
  { value: 'cleanser', label: ru.productCategoryCleanser },
  { value: 'toner', label: ru.productCategoryToner },
  { value: 'serum', label: ru.productCategorySerum },
  { value: 'moisturizer', label: ru.productCategoryMoisturizer },
  { value: 'sunscreen', label: ru.productCategorySunscreen },
  { value: 'mask', label: ru.productCategoryMask },
  { value: 'hair', label: ru.productCategoryHair },
  { value: 'other', label: ru.productCategoryOther },
  { value: 'household', label: ru.productCategoryHousehold },
]

const AREA_OPTIONS = [
  { value: '', label: ru.productArea },
  { value: 'face', label: ru.productAreaFace },
  { value: 'hair', label: ru.productAreaHair },
  { value: 'body', label: ru.productAreaBody },
]

const TIME_OPTIONS = [
  { value: '', label: ru.productTimeOfDay },
  { value: 'morning', label: ru.productTimeMorning },
  { value: 'evening', label: ru.productTimeEvening },
  { value: 'anytime', label: ru.productTimeAnytime },
]

// ── Star Rating ────────────────────────────────────────────────────────────────

function StarRating({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const displayed = hovered ?? value ?? 0

  return (
    <div className="product-rating">
      <span className="product-rating__label">{label}</span>
      <div className="product-rating__stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`product-rating__star${displayed >= star ? ' product-rating__star--on' : ''}`}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(value === star ? null : star)}
            aria-label={`${star} из 5`}
          >
            ★
          </button>
        ))}
        {value !== null && (
          <button type="button" className="product-rating__clear" onClick={() => onChange(null)} aria-label="Сбросить">×</button>
        )}
      </div>
    </div>
  )
}

// ── Form ───────────────────────────────────────────────────────────────────────

const defaultValues: BeautyProductFormValues = {
  name: '',
  category: '',
  area: '',
  time_of_day: '',
  notes: '',
  price: '',
  ...emptyProductRatings(),
}

export function BeautyProductForm({ product, onSave, onCancel }: BeautyProductFormProps) {
  const [values, setValues] = useState<BeautyProductFormValues>(
    product
      ? {
          name: product.name,
          category: product.category ?? '',
          area: product.area ?? '',
          time_of_day: product.time_of_day ?? '',
          notes: product.notes ?? '',
          price: product.price != null ? String(product.price) : '',
          ...ratingsFromProduct(product),
        }
      : defaultValues
  )
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(product?.image_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = (field: keyof BeautyProductFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }))
    setError(null)
  }

  const handleRating = (field: keyof BeautyProductRatings) => (v: number | null) => {
    setValues((prev) => ({ ...prev, [field]: v }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError(ru.productPhotoInvalidType); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.name.trim()) { setError(ru.productNameRequired); return }
    setSaving(true); setError(null)
    try {
      await onSave(values, photoFile)
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
          {product ? ru.editProduct : ru.addProduct}
        </h2>
        <form onSubmit={handleSubmit}>

          {/* Photo */}
          <div className="form-group">
            <label>{ru.productPhoto}</label>
            <div className="beauty-product-form__photo">
              {photoPreview ? (
                <img src={photoPreview} alt="" className="beauty-product-form__preview" />
              ) : (
                <div className="beauty-product-form__photo-placeholder" />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="beauty-product-form__file-input"
                aria-label={ru.productPhotoAdd}
              />
              <button type="button" className="btn-ghost beauty-product-form__photo-btn" onClick={() => fileInputRef.current?.click()}>
                {ru.productPhotoAdd}
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="form-group">
            <label htmlFor="product-name">{ru.productName}</label>
            <input id="product-name" type="text" value={values.name} onChange={handleChange('name')}
              placeholder={ru.productNamePlaceholder} required />
          </div>

          {/* Category */}
          <div className="form-group">
            <label htmlFor="product-category">{ru.productCategory}</label>
            <select id="product-category" value={values.category} onChange={handleChange('category')}>
              {CATEGORY_OPTIONS.map((opt) => <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Area */}
          <div className="form-group">
            <label htmlFor="product-area">{ru.productArea}</label>
            <select id="product-area" value={values.area} onChange={handleChange('area')}>
              {AREA_OPTIONS.map((opt) => <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Time of day */}
          <div className="form-group">
            <label htmlFor="product-time">{ru.productTimeOfDay}</label>
            <select id="product-time" value={values.time_of_day} onChange={handleChange('time_of_day')}>
              {TIME_OPTIONS.map((opt) => <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {/* Price */}
          <div className="form-group">
            <label htmlFor="product-price">Цена</label>
            <div className="product-price-input">
              <input
                id="product-price"
                type="number"
                min="0"
                step="0.01"
                value={values.price}
                onChange={handleChange('price')}
                placeholder="0.00"
              />
              <span className="product-price-input__currency">€</span>
            </div>
          </div>

          {/* Ratings */}
          <div className="form-group">
            <label>Оценки</label>
            <div className="product-ratings">
              {PRODUCT_RATING_ROWS.map(({ key, label }) => (
                <StarRating key={key} label={label} value={values[key]} onChange={handleRating(key)} />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label htmlFor="product-notes">{ru.productNotes}</label>
            <textarea id="product-notes" value={values.notes} onChange={handleChange('notes')}
              placeholder={ru.productNotesPlaceholder} rows={3} />
          </div>

          {error && <p className="beauty-product-form__error" role="alert">{error}</p>}

          <div className="beauty-product-form__actions">
            <button type="button" className="btn-ghost" onClick={onCancel}>{ru.cancel}</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? ru.loading : ru.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
