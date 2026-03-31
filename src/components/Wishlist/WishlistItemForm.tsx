import { useState, useRef, useEffect } from 'react'
import type { WishlistItem, WishlistTargetKind } from '../../lib/supabase'
import { ru } from '../../constants/ru'
import type { WishlistFormValues } from '../../hooks/useWishlist'
import { emptyWishlistFormValues, valuesFromWishlistItem } from '../../hooks/useWishlist'

type Props = {
  item: WishlistItem | null
  onSave: (values: WishlistFormValues, photoFile: File | null) => Promise<{ ok: boolean; message?: string }>
  onCancel: () => void
}

const KIND_OPTIONS: { value: WishlistTargetKind; label: string }[] = [
  { value: 'cosmetics', label: ru.wishlistKindCosmetics },
  { value: 'clothing', label: ru.wishlistKindClothing },
  { value: 'vitamin', label: ru.wishlistKindVitamin },
  { value: 'product', label: ru.wishlistKindProduct },
]

const COSMETICS_CATEGORY = [
  { value: '', label: ru.productCategoryPlaceholder },
  { value: 'cleanser', label: ru.productCategoryCleanser },
  { value: 'toner', label: ru.productCategoryToner },
  { value: 'serum', label: ru.productCategorySerum },
  { value: 'moisturizer', label: ru.productCategoryMoisturizer },
  { value: 'sunscreen', label: ru.productCategorySunscreen },
  { value: 'mask', label: ru.productCategoryMask },
  { value: 'hair', label: ru.productCategoryHair },
  { value: 'other', label: ru.productCategoryOther },
]

const COSMETICS_AREA = [
  { value: '', label: ru.productArea },
  { value: 'face', label: ru.productAreaFace },
  { value: 'hair', label: ru.productAreaHair },
  { value: 'body', label: ru.productAreaBody },
]

const COSMETICS_TIME = [
  { value: '', label: ru.productTimeOfDay },
  { value: 'morning', label: ru.productTimeMorning },
  { value: 'evening', label: ru.productTimeEvening },
  { value: 'anytime', label: ru.productTimeAnytime },
]

const CLOTHING_CAT = [
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

export function WishlistItemForm({ item, onSave, onCancel }: Props) {
  const [values, setValues] = useState<WishlistFormValues>(() =>
    item ? valuesFromWishlistItem(item) : emptyWishlistFormValues()
  )
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(item?.image_url ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValues(item ? valuesFromWishlistItem(item) : emptyWishlistFormValues())
    setPhotoFile(null)
    setPhotoPreview(item?.image_url ?? null)
  }, [item])

  const handleChange = (field: keyof WishlistFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }))
    setError(null)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError(ru.productPhotoInvalidType)
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.name.trim()) {
      setError(ru.productNameRequired)
      return
    }
    setSaving(true)
    setError(null)
    const res = await onSave(values, photoFile)
    setSaving(false)
    if (!res.ok) setError(res.message ?? ru.error)
  }

  return (
    <div className="beauty-product-form-overlay" onClick={onCancel}>
      <div className="beauty-product-form wishlist-item-form" onClick={(e) => e.stopPropagation()}>
        <h2 className="beauty-product-form__title">{item ? ru.wishlistEdit : ru.wishlistAdd}</h2>
        <form onSubmit={handleSubmit}>
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
              <button
                type="button"
                className="btn-ghost beauty-product-form__photo-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                {ru.productPhotoAdd}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="wl-name">{ru.productName}</label>
            <input
              id="wl-name"
              type="text"
              value={values.name}
              onChange={handleChange('name')}
              placeholder={ru.productNamePlaceholder}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="wl-kind">{ru.wishlistTargetKind}</label>
            <select id="wl-kind" value={values.target_kind} onChange={handleChange('target_kind')}>
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="wl-price">{ru.wishlistPriceNote} (€)</label>
            <input
              id="wl-price"
              type="text"
              inputMode="decimal"
              value={values.price}
              onChange={handleChange('price')}
              placeholder="0"
            />
          </div>

          {values.target_kind === 'cosmetics' && (
            <div className="wishlist-item-form__section">
              <p className="wishlist-item-form__section-title">{ru.wishlistMetaHintCosmetics}</p>
              <div className="form-group">
                <label>{ru.productCategory}</label>
                <select value={values.cosmeticsCategory} onChange={handleChange('cosmeticsCategory')}>
                  {COSMETICS_CATEGORY.map((o) => (
                    <option key={o.value || 'e'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{ru.productArea}</label>
                <select value={values.cosmeticsArea} onChange={handleChange('cosmeticsArea')}>
                  {COSMETICS_AREA.map((o) => (
                    <option key={o.value || 'e'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{ru.productTimeOfDay}</label>
                <select value={values.cosmeticsTime} onChange={handleChange('cosmeticsTime')}>
                  {COSMETICS_TIME.map((o) => (
                    <option key={o.value || 'e'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {values.target_kind === 'clothing' && (
            <div className="wishlist-item-form__section">
              <p className="wishlist-item-form__section-title">{ru.wishlistMetaHintClothing}</p>
              <div className="form-group">
                <label>{ru.wardrobeCategory}</label>
                <select value={values.clothingCategory} onChange={handleChange('clothingCategory')}>
                  {CLOTHING_CAT.map((o) => (
                    <option key={o.value || 'e'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{ru.wardrobeColor}</label>
                <input
                  type="text"
                  value={values.clothingColor}
                  onChange={handleChange('clothingColor')}
                  placeholder={ru.wardrobeColorPlaceholder}
                />
              </div>
              <div className="form-group">
                <label>{ru.wardrobeSeason}</label>
                <select value={values.clothingSeason} onChange={handleChange('clothingSeason')}>
                  {SEASON_OPTIONS.map((o) => (
                    <option key={o.value || 'e'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {values.target_kind === 'vitamin' && (
            <div className="wishlist-item-form__section">
              <p className="wishlist-item-form__section-title">{ru.wishlistMetaHintVitamin}</p>
              <div className="form-group">
                <label htmlFor="wl-dosage">{ru.wishlistMetaHintVitamin}</label>
                <input
                  id="wl-dosage"
                  type="text"
                  value={values.vitaminDosage}
                  onChange={handleChange('vitaminDosage')}
                  placeholder="Например: 1 капсула"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="wl-notes">{ru.productNotes}</label>
            <textarea
              id="wl-notes"
              value={values.notes}
              onChange={handleChange('notes')}
              placeholder={ru.productNotesPlaceholder}
              rows={3}
            />
          </div>

          {error && (
            <p className="beauty-product-form__error" role="alert">
              {error}
            </p>
          )}

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
