import { useState, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useWishlist } from '../hooks/useWishlist'
import type { WishlistFormValues } from '../hooks/useWishlist'
import type { WishlistItem, WishlistTargetKind } from '../lib/supabase'
import { WishlistItemCard } from '../components/Wishlist/WishlistItemCard'
import { WishlistItemForm } from '../components/Wishlist/WishlistItemForm'
import { ru } from '../constants/ru'

export function Wishlist() {
  const { user } = useAuth()
  const { items, loading, movingId, saveItem, deleteItem, moveToOwned } = useWishlist(user?.id)
  const [formOpen, setFormOpen] = useState<WishlistItem | 'new' | null>(null)
  const [filterKind, setFilterKind] = useState<WishlistTargetKind | ''>('')
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const filtered = filterKind ? items.filter((i) => i.target_kind === filterKind) : items

  const handleSave = useCallback(
    async (values: WishlistFormValues, photoFile: File | null) => {
      const existing = formOpen !== 'new' && formOpen ? formOpen : null
      const res = await saveItem(values, photoFile, existing)
      if (res.ok) {
        setFormOpen(null)
        setBanner(null)
      }
      return res
    },
    [saveItem, formOpen]
  )

  const handleDelete = async (item: WishlistItem) => {
    if (!window.confirm(ru.wishlistDeleteConfirm)) return
    await deleteItem(item)
    setBanner(null)
  }

  const handleMarkOwned = async (item: WishlistItem) => {
    if (!window.confirm(ru.wishlistMarkOwnedConfirm)) return
    const r = await moveToOwned(item)
    if (r.ok) {
      setBanner({ type: 'ok', text: ru.wishlistMovedHint })
    } else {
      setBanner({ type: 'err', text: `${ru.wishlistMoveError}: ${r.message}` })
    }
  }

  return (
    <div className="catalog-page wishlist-page">
      <header className="catalog-header">
        <h1 className="catalog-header__title">{ru.wishlistTitle}</h1>
        <p className="wishlist-page__subtitle">{ru.wishlistSubtitle}</p>
      </header>

      {banner && (
        <div
          className={`wishlist-page__banner${banner.type === 'err' ? ' wishlist-page__banner--err' : ''}`}
          role="status"
        >
          {banner.text}
        </div>
      )}

      <div className="catalog-toolbar">
        <div className="catalog-toolbar__filters">
          <select
            className="catalog-select"
            value={filterKind}
            onChange={(e) => setFilterKind((e.target.value || '') as WishlistTargetKind | '')}
            aria-label={ru.wishlistFilterAll}
          >
            <option value="">{ru.wishlistFilterAll}</option>
            <option value="cosmetics">{ru.wishlistKindCosmetics}</option>
            <option value="clothing">{ru.wishlistKindClothing}</option>
            <option value="vitamin">{ru.wishlistKindVitamin}</option>
            <option value="product">{ru.wishlistKindProduct}</option>
          </select>
        </div>
        <div className="catalog-toolbar__actions">
          <button type="button" className="btn-primary" onClick={() => setFormOpen('new')}>
            {ru.wishlistAdd}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="empty-state">{ru.loading}</p>
      ) : filtered.length === 0 ? (
        <div className="catalog-empty">
          <div className="catalog-empty__shape" />
          {items.length === 0 ? ru.wishlistEmpty : ru.noProductsFilter}
        </div>
      ) : (
        <div className="catalog-grid">
          {filtered.map((item) => (
            <WishlistItemCard
              key={item.id}
              item={item}
              onEdit={setFormOpen}
              onDelete={handleDelete}
              onMarkOwned={handleMarkOwned}
              moving={movingId === item.id}
            />
          ))}
        </div>
      )}

      {formOpen != null && (
        <WishlistItemForm
          item={formOpen === 'new' ? null : formOpen}
          onSave={handleSave}
          onCancel={() => setFormOpen(null)}
        />
      )}
    </div>
  )
}
