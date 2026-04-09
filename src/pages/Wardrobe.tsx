import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase, WARDROBE_BUCKET } from '../lib/supabase'
import type { WardrobeItem } from '../lib/supabase'
import { ru } from '../constants/ru'
import { WardrobeItemCard } from '../components/Wardrobe/WardrobeItemCard'
import { WardrobeItemForm } from '../components/Wardrobe/WardrobeItemForm'
import type { WardrobeItemFormValues } from '../components/Wardrobe/WardrobeItemForm'

function getFileExtension(file: File): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return mimeToExt[file.type] ?? 'jpg'
}

const SEASON_OPTIONS = [
  { value: '', label: 'Все сезоны' },
  { value: 'spring', label: 'Весна' },
  { value: 'summer', label: 'Лето' },
  { value: 'autumn', label: 'Осень' },
  { value: 'winter', label: 'Зима' },
]

export function Wardrobe() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<WardrobeItem[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterSeason, setFilterSeason] = useState<string>('')
  const [formItem, setFormItem] = useState<WardrobeItem | null | 'new'>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const fetchItems = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Wardrobe items fetch error:', error)
      setItems([])
      return
    }
    setItems((data as WardrobeItem[]) ?? [])
  }, [user?.id])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleSave = useCallback(
    async (values: WardrobeItemFormValues, photoFile: File | null) => {
      if (!user?.id) return
      const categoryForPath = values.category || 'other'

      if (formItem === 'new' || formItem === null) {
        const { data: inserted, error: insertError } = await supabase
          .from('wardrobe_items')
          .insert({
            user_id: user.id,
            name: values.name.trim(),
            category: values.category || null,
            color: values.color.trim() || null,
            season: values.season.trim() || null,
            notes: values.notes.trim() || null,
            sort_order: 0,
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        if (insertError) throw new Error(insertError.message)
        const itemId = (inserted as { id: string }).id
        if (photoFile && itemId) {
          const ext = getFileExtension(photoFile)
          const path = `${user.id}/${categoryForPath}/${itemId}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from(WARDROBE_BUCKET)
            .upload(path, photoFile, { upsert: true })
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from(WARDROBE_BUCKET)
              .getPublicUrl(path)
            await supabase
              .from('wardrobe_items')
              .update({
                photo_url: urlData.publicUrl,
                updated_at: new Date().toISOString(),
              })
              .eq('id', itemId)
          }
        }
      } else {
        const itemId = formItem.id
        await supabase
          .from('wardrobe_items')
          .update({
            name: values.name.trim(),
            category: values.category || null,
            color: values.color.trim() || null,
            season: values.season.trim() || null,
            notes: values.notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId)
        if (photoFile) {
          const ext = getFileExtension(photoFile)
          const path = `${user.id}/${categoryForPath}/${itemId}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from(WARDROBE_BUCKET)
            .upload(path, photoFile, { upsert: true })
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from(WARDROBE_BUCKET)
              .getPublicUrl(path)
            await supabase
              .from('wardrobe_items')
              .update({
                photo_url: urlData.publicUrl,
                updated_at: new Date().toISOString(),
              })
              .eq('id', itemId)
          }
        }
      }
      setFormItem(null)
      await fetchItems()
    },
    [user?.id, formItem, fetchItems]
  )

  const handleDelete = useCallback(
    async (item: WardrobeItem) => {
      if (!window.confirm(ru.deleteWardrobeItemConfirm)) return
      await supabase.from('wardrobe_items').delete().eq('id', item.id)
      const pathMatch = item.photo_url?.match(/wardrobe\/(.+)$/)
      if (pathMatch) {
        await supabase.storage.from(WARDROBE_BUCKET).remove([pathMatch[1]])
      }
      await fetchItems()
    },
    [fetchItems]
  )

  const filteredItems = items.filter((i) => {
    if (filterCategory && i.category !== filterCategory) return false
    if (filterSeason && i.season !== filterSeason) return false
    return true
  })

  const categoryOptions = [
    { value: '', label: ru.filterAll },
    { value: 'top', label: ru.wardrobeCategoryTop },
    { value: 'bottom', label: ru.wardrobeCategoryBottom },
    { value: 'dress', label: ru.wardrobeCategoryDress },
    { value: 'shoes', label: ru.wardrobeCategoryShoes },
    { value: 'accessory', label: ru.wardrobeCategoryAccessory },
  ]

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreateOutfitFromSelection = () => {
    const ids = Array.from(selectedIds).join(',')
    navigate(`/wardrobe/outfits/new?items=${ids}`)
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  return (
    <div className="catalog-page wardrobe-page">
      <header className="catalog-header">
        <h1 className="catalog-header__title">{ru.wardrobeTitle}</h1>
        <nav className="catalog-header__nav">
          <Link
            to="/wardrobe"
            className="catalog-header__tab catalog-header__tab--active"
          >
            Вещи
          </Link>
          <Link to="/wardrobe/outfits" className="catalog-header__tab">
            <Layers size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {ru.myOutfits}
          </Link>
        </nav>
      </header>

      <div className="catalog-toolbar">
        <div className="catalog-toolbar__filters">
          <select className="catalog-select" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            {categoryOptions.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select className="catalog-select" value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
            {SEASON_OPTIONS.map((opt) => (
              <option key={opt.value || 'all-seasons'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="catalog-toolbar__actions">
          {!selectMode ? (
            <>
              <button type="button" className="btn-primary" onClick={() => setFormItem('new')}>
                {ru.wardrobeAddItem}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setSelectMode(true)}>
                Выборка
              </button>
            </>
          ) : (
            <>
              <span className="catalog-select-hint">
                {selectedIds.size > 0 ? `Выбрано: ${selectedIds.size}` : 'Выбери вещи'}
              </span>
              <button type="button" className="btn-primary" disabled={selectedIds.size === 0} onClick={handleCreateOutfitFromSelection}>
                Создать образ
              </button>
              <button type="button" className="btn-ghost" onClick={exitSelectMode}>Отмена</button>
            </>
          )}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="catalog-empty">
          <div className="catalog-empty__shape" />
          {filterCategory || filterSeason ? ru.noWardrobeFilter : ru.noWardrobeItems}
        </div>
      ) : (
        <div className="catalog-grid">
          {filteredItems.map((item) => (
            <WardrobeItemCard
              key={item.id}
              item={item}
              onEdit={selectMode ? () => toggleSelect(item.id) : (i) => setFormItem(i)}
              onDelete={handleDelete}
              selectMode={selectMode}
              selected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {formItem != null && (
        <WardrobeItemForm
          item={formItem === 'new' ? null : formItem}
          onSave={handleSave}
          onCancel={() => setFormItem(null)}
        />
      )}
    </div>
  )
}
