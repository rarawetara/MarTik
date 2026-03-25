import { useCallback, useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { BEAUTY_PRODUCTS_BUCKET, BEAUTY_PROGRESS_BUCKET } from '../lib/supabase'
import type { BeautyProduct, BeautyRoutine, BeautyRoutineStep, BeautyProgressPhoto, DailyEntry } from '../lib/supabase'
import { ru } from '../constants/ru'
import { BeautyProductCard } from '../components/Beauty/BeautyProductCard'
import { BeautyProductForm } from '../components/Beauty/BeautyProductForm'
import type { BeautyProductFormValues } from '../components/Beauty/BeautyProductForm'
import { BeautyRoutineCard } from '../components/Beauty/BeautyRoutineCard'
import type { StepWithProduct } from '../components/Beauty/BeautyRoutineCard'
import { BeautyRoutineForm } from '../components/Beauty/BeautyRoutineForm'
import type { RoutineStepRow, RoutineScheduling } from '../components/Beauty/BeautyRoutineForm'

function getFileExtension(file: File): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  return mimeToExt[file.type] ?? 'jpg'
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

type ProgressPhotoWithDate = BeautyProgressPhoto & { entry_date?: string; routine_name?: string }

const RATING_OPTIONS: { value: '' | 'low' | 'medium' | 'good' | 'great'; label: string }[] = [
  { value: '', label: '—' },
  { value: 'low', label: ru.ratingLow },
  { value: 'medium', label: ru.ratingMedium },
  { value: 'good', label: ru.ratingGood },
  { value: 'great', label: ru.ratingGreat },
]

type RoutineWithSteps = {
  routine: BeautyRoutine
  stepsWithProduct: StepWithProduct[]
}

export function Beauty() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'products' | 'routines' | 'progress'>('products')
  const [products, setProducts] = useState<BeautyProduct[]>([])
  const [filterArea, setFilterArea] = useState<string>('')
  const [filterTime, setFilterTime] = useState<string>('')
  const [formProduct, setFormProduct] = useState<BeautyProduct | null | 'new'>(null)
  const [routinesWithSteps, setRoutinesWithSteps] = useState<RoutineWithSteps[]>([])
  const [filterRoutineType, setFilterRoutineType] = useState<string>('')
  const [formRoutine, setFormRoutine] = useState<BeautyRoutine | null | 'new'>(null)
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhotoWithDate[]>([])
  const [filterProgressArea, setFilterProgressArea] = useState<string>('')
  const [progressUploadArea, setProgressUploadArea] = useState<'face' | 'hair' | null>(null)
  const [progressUploadDate, setProgressUploadDate] = useState<string>(() => toDateString(new Date()))
  const [progressUploadNotes, setProgressUploadNotes] = useState('')
  const [progressUploadFile, setProgressUploadFile] = useState<File | null>(null)
  const [progressUploading, setProgressUploading] = useState(false)
  const [progressUploadRoutineId, setProgressUploadRoutineId] = useState<string>('')
  const [progressUploadFaceRating, setProgressUploadFaceRating] = useState<string>('')
  const [progressUploadHairQuality, setProgressUploadHairQuality] = useState<string>('')
  const [progressUploadHairLength, setProgressUploadHairLength] = useState<string>('')
  const [editingProgressPhoto, setEditingProgressPhoto] = useState<ProgressPhotoWithDate | null>(null)

  // Note categories (stored per-user in localStorage)
  const [photoCategories, setPhotoCategories] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('beauty_note_cats') ?? '[]') } catch { return [] }
  })
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [progressUploadCategory, setProgressUploadCategory] = useState('')

  // Diary timeline filters + inline edit
  const [filterDiaryType, setFilterDiaryType] = useState('')
  const [filterDiaryCategory, setFilterDiaryCategory] = useState('')
  type DiaryInlineEdit = { photoId: string; notes: string; category: string }
  const [inlineDiaryEdit, setInlineDiaryEdit] = useState<DiaryInlineEdit | null>(null)

  // Future tasks (persisted in localStorage)
  type FutureTask = { id: string; text: string; createdAt: string; completedAt: string | null; dueDate: string }
  const todayStr = new Date().toISOString().slice(0, 10)
  const [futureTasks, setFutureTasks] = useState<FutureTask[]>(() => {
    try {
      const raw: FutureTask[] = JSON.parse(localStorage.getItem('beauty_future_tasks') ?? '[]')
      // Roll over incomplete tasks to today
      return raw.map((t) => t.completedAt ? t : { ...t, dueDate: todayStr })
    } catch { return [] }
  })
  const [newFutureTaskText, setNewFutureTaskText] = useState('')
  const [showDoneFutureTasks, setShowDoneFutureTasks] = useState(false)

  const fetchProducts = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('beauty_products')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Beauty products fetch error:', error)
      setProducts([])
      return
    }
    setProducts((data as BeautyProduct[]) ?? [])
  }, [user?.id])

  const fetchRoutines = useCallback(async () => {
    if (!user?.id) return
    const { data: routinesData, error: routinesError } = await supabase
      .from('beauty_routines')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    if (routinesError) {
      console.error('Beauty routines fetch error:', routinesError)
      setRoutinesWithSteps([])
      return
    }
    const routines = (routinesData as BeautyRoutine[]) ?? []
    const withSteps: RoutineWithSteps[] = []
    for (const routine of routines) {
      const { data: stepsData } = await supabase
        .from('beauty_routine_steps')
        .select('*, beauty_products(*)')
        .eq('routine_id', routine.id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
      const rows = (stepsData as Array<BeautyRoutineStep & { beauty_products: BeautyProduct | null }>) ?? []
      withSteps.push({
        routine,
        stepsWithProduct: rows.map((row) => ({
          step: {
            id: row.id,
            routine_id: row.routine_id,
            product_id: row.product_id,
            sort_order: row.sort_order,
            deleted_at: row.deleted_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
          },
          product: row.beauty_products ?? null,
        })),
      })
    }
    setRoutinesWithSteps(withSteps)
  }, [user?.id])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  useEffect(() => {
    if (activeTab === 'routines' || activeTab === 'progress') {
      fetchRoutines()
    }
  }, [activeTab, fetchRoutines])

  const getOrCreateDailyEntry = useCallback(
    async (userId: string, entryDate: string): Promise<DailyEntry | null> => {
      const { data: existing } = await supabase
        .from('daily_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('entry_date', entryDate)
        .maybeSingle()
      if (existing) return existing as DailyEntry
      const { data: inserted, error } = await supabase
        .from('daily_entries')
        .insert({ user_id: userId, entry_date: entryDate })
        .select()
        .single()
      if (error || !inserted) return null
      return inserted as DailyEntry
    },
    []
  )

  const fetchProgressPhotos = useCallback(async () => {
    if (!user?.id) return
    const { data, error } = await supabase
      .from('beauty_progress_photos')
      .select('*, daily_entries(entry_date), beauty_routines(name)')
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false })
    if (error) {
      console.error('Progress photos fetch error:', error)
      setProgressPhotos([])
      return
    }
    const rows = (data as Array<BeautyProgressPhoto & { daily_entries: { entry_date: string } | null; beauty_routines: { name: string } | null }>) ?? []
    setProgressPhotos(
      rows.map((p) => ({
        ...p,
        entry_date: p.daily_entries?.entry_date,
        routine_name: p.beauty_routines?.name,
      }))
    )
  }, [user?.id])

  useEffect(() => {
    if (activeTab === 'progress') {
      fetchProgressPhotos()
    }
  }, [activeTab, fetchProgressPhotos])

  // Persist future tasks
  useEffect(() => {
    localStorage.setItem('beauty_future_tasks', JSON.stringify(futureTasks))
  }, [futureTasks])

  // Persist categories
  useEffect(() => {
    localStorage.setItem('beauty_note_cats', JSON.stringify(photoCategories))
  }, [photoCategories])

  const addFutureTask = useCallback((text: string) => {
    if (!text.trim()) return
    setFutureTasks((prev) => [...prev, {
      id: crypto.randomUUID(), text: text.trim(),
      createdAt: new Date().toISOString(), completedAt: null, dueDate: todayStr,
    }])
    setNewFutureTaskText('')
  }, [todayStr])

  const toggleFutureTask = useCallback((id: string) => {
    setFutureTasks((prev) => prev.map((t) =>
      t.id !== id ? t : { ...t, completedAt: t.completedAt ? null : new Date().toISOString() }
    ))
  }, [])

  const deleteFutureTask = useCallback((id: string) => {
    setFutureTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addCategory = useCallback((name: string) => {
    const n = name.trim()
    if (!n || photoCategories.includes(n)) return
    setPhotoCategories((prev) => [...prev, n])
    setNewCategoryInput('')
  }, [photoCategories])

  const removeCategory = useCallback((name: string) => {
    setPhotoCategories((prev) => prev.filter((c) => c !== name))
  }, [])

  const handleUploadProgress = useCallback(
    async (
      area: 'face' | 'hair',
      file: File,
      dateStr: string,
      notes: string,
      routineId: string | null,
      faceRating: string | null,
      hairQualityRating: string | null,
      hairLengthRating: string | null,
      noteCategory: string | null
    ) => {
      if (!user?.id) return
      const entry = await getOrCreateDailyEntry(user.id, dateStr)
      if (!entry) throw new Error('Не удалось создать запись за день')
      const ext = getFileExtension(file)
      const fileId = crypto.randomUUID()
      const path = `${user.id}/${area}/${fileId}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from(BEAUTY_PROGRESS_BUCKET)
        .upload(path, file, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from(BEAUTY_PROGRESS_BUCKET).getPublicUrl(path)
      const now = new Date().toISOString()
      const takenAt = dateStr ? `${dateStr}T12:00:00.000Z` : now
      const payload: Record<string, unknown> = {
        user_id: user.id,
        daily_entry_id: entry.id,
        area,
        photo_url: urlData.publicUrl,
        notes: notes.trim() || null,
        note_category: noteCategory || null,
        taken_at: takenAt,
        updated_at: now,
      }
      if (routineId) payload.routine_id = routineId
      if (faceRating && (area === 'face')) payload.face_condition_rating = faceRating
      if (hairQualityRating && (area === 'hair')) payload.hair_quality_rating = hairQualityRating
      if (hairLengthRating && (area === 'hair')) payload.hair_length_feeling_rating = hairLengthRating
      const { error: insertError } = await supabase.from('beauty_progress_photos').insert(payload)
      if (insertError) throw new Error(insertError.message)
      setProgressUploadArea(null)
      setProgressUploadNotes('')
      setProgressUploadCategory('')
      setProgressUploadFile(null)
      setProgressUploadDate(toDateString(new Date()))
      setProgressUploadRoutineId('')
      setProgressUploadFaceRating('')
      setProgressUploadHairQuality('')
      setProgressUploadHairLength('')
      await fetchProgressPhotos()
    },
    [user?.id, getOrCreateDailyEntry, fetchProgressPhotos]
  )

  const handleUpdateProgress = useCallback(
    async (
      photoId: string,
      notes: string,
      routineId: string | null,
      faceRating: string | null,
      hairQualityRating: string | null,
      hairLengthRating: string | null,
      area: string,
      noteCategory?: string | null
    ) => {
      const payload: Record<string, unknown> = {
        notes: notes.trim() || null,
        note_category: noteCategory !== undefined ? (noteCategory || null) : undefined,
        updated_at: new Date().toISOString(),
        routine_id: routineId || null,
      }
      if (area === 'face') {
        payload.face_condition_rating = faceRating || null
        payload.hair_quality_rating = null
        payload.hair_length_feeling_rating = null
      } else {
        payload.face_condition_rating = null
        payload.hair_quality_rating = hairQualityRating || null
        payload.hair_length_feeling_rating = hairLengthRating || null
      }
      const { error } = await supabase.from('beauty_progress_photos').update(payload).eq('id', photoId)
      if (error) throw new Error(error.message)
      setEditingProgressPhoto(null)
      await fetchProgressPhotos()
    },
    [fetchProgressPhotos]
  )

  const handleDeleteProgress = useCallback(
    async (photo: BeautyProgressPhoto) => {
      if (!window.confirm(ru.deleteProgressConfirm)) return
      await supabase.from('beauty_progress_photos').delete().eq('id', photo.id)
      const pathMatch = photo.photo_url.match(/beauty-progress\/(.+)$/)
      if (pathMatch) {
        await supabase.storage.from(BEAUTY_PROGRESS_BUCKET).remove([pathMatch[1]])
      }
      await fetchProgressPhotos()
    },
    [fetchProgressPhotos]
  )

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel('beauty_products_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beauty_products', filter: `user_id=eq.${user.id}` },
        () => fetchProducts()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchProducts])

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel('beauty_routines_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'beauty_routines', filter: `user_id=eq.${user.id}` },
        () => fetchRoutines()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, fetchRoutines])

  const filteredProducts = products.filter((p) => {
    if (filterArea && p.area !== filterArea) return false
    if (filterTime && p.time_of_day !== filterTime) return false
    return true
  })

  const handleSave = useCallback(
    async (values: BeautyProductFormValues, photoFile: File | null) => {
      if (!user?.id) return
      if (formProduct === 'new' || formProduct === null) {
        const { data: inserted, error: insertError } = await supabase
          .from('beauty_products')
          .insert({
            user_id: user.id,
            name: values.name.trim(),
            category: values.category || null,
            area: values.area || null,
            time_of_day: values.time_of_day || null,
            notes: values.notes.trim() || null,
            sort_order: 0,
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()
        if (insertError) throw new Error(insertError.message)
        const productId = (inserted as { id: string }).id
        if (photoFile && productId) {
          const ext = getFileExtension(photoFile)
          const path = `${user.id}/${productId}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from(BEAUTY_PRODUCTS_BUCKET)
            .upload(path, photoFile, { upsert: true })
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from(BEAUTY_PRODUCTS_BUCKET)
              .getPublicUrl(path)
            await supabase
              .from('beauty_products')
              .update({ image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
              .eq('id', productId)
          }
        }
      } else {
        const productId = formProduct.id
        await supabase
          .from('beauty_products')
          .update({
            name: values.name.trim(),
            category: values.category || null,
            area: values.area || null,
            time_of_day: values.time_of_day || null,
            notes: values.notes.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', productId)
        if (photoFile) {
          const ext = getFileExtension(photoFile)
          const path = `${user.id}/${productId}.${ext}`
          const { error: uploadError } = await supabase.storage
            .from(BEAUTY_PRODUCTS_BUCKET)
            .upload(path, photoFile, { upsert: true })
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from(BEAUTY_PRODUCTS_BUCKET)
              .getPublicUrl(path)
            await supabase
              .from('beauty_products')
              .update({ image_url: urlData.publicUrl, updated_at: new Date().toISOString() })
              .eq('id', productId)
          }
        }
      }
      setFormProduct(null)
      await fetchProducts()
    },
    [user?.id, formProduct, fetchProducts]
  )

  const handleDelete = useCallback(
    async (product: BeautyProduct) => {
      if (!window.confirm(ru.deleteProductConfirm)) return
      await supabase.from('beauty_products').delete().eq('id', product.id)
      if (product.image_url) {
        const pathMatch = product.image_url.match(/beauty-products\/(.+)$/)
        if (pathMatch) {
          await supabase.storage.from(BEAUTY_PRODUCTS_BUCKET).remove([pathMatch[1]])
        }
      }
      setFormProduct(null)
      await fetchProducts()
    },
    [fetchProducts]
  )

  const getInitialStepsForRoutine = useCallback(
    (routine: BeautyRoutine | null): RoutineStepRow[] => {
      if (!routine) return []
      const found = routinesWithSteps.find((r) => r.routine.id === routine.id)
      if (!found) return []
      return found.stepsWithProduct.map(({ step, product }) => ({
        stepId: step.id,
        productId: step.product_id,
        product: product ?? undefined,
      }))
    },
    [routinesWithSteps]
  )

  const handleSaveRoutine = useCallback(
    async (name: string, type: string | null, steps: RoutineStepRow[], scheduling: RoutineScheduling) => {
      if (!user?.id) return
      const now = new Date().toISOString()
      const routinePayload = {
        name,
        type,
        updated_at: now,
        cadence_type: scheduling.cadence_type,
        weekly_days: scheduling.weekly_days,
        monthly_days: scheduling.monthly_days,
        is_active: scheduling.is_active,
      }
      if (formRoutine === 'new' || formRoutine === null) {
        const { data: inserted, error: routineError } = await supabase
          .from('beauty_routines')
          .insert({
            user_id: user.id,
            ...routinePayload,
            sort_order: 0,
          })
          .select('id')
          .single()
        if (routineError) throw new Error(routineError.message)
        const routineId = (inserted as { id: string }).id
        for (let i = 0; i < steps.length; i++) {
          await supabase.from('beauty_routine_steps').insert({
            routine_id: routineId,
            product_id: steps[i].productId,
            sort_order: i,
            updated_at: now,
          })
        }
      } else {
        const routineId = formRoutine.id
        await supabase
          .from('beauty_routines')
          .update(routinePayload)
          .eq('id', routineId)
        const formStepIds = new Set(steps.map((s) => s.stepId).filter(Boolean) as string[])
        const { data: existingSteps } = await supabase
          .from('beauty_routine_steps')
          .select('id')
          .eq('routine_id', routineId)
          .is('deleted_at', null)
        const existing = (existingSteps as { id: string }[]) ?? []
        for (const row of existing) {
          if (!formStepIds.has(row.id)) {
            await supabase
              .from('beauty_routine_steps')
              .update({ deleted_at: now, updated_at: now })
              .eq('id', row.id)
          }
        }
        for (let i = 0; i < steps.length; i++) {
          const row = steps[i]
          if (row.stepId) {
            await supabase
              .from('beauty_routine_steps')
              .update({ sort_order: i, updated_at: now })
              .eq('id', row.stepId)
          } else {
            await supabase.from('beauty_routine_steps').insert({
              routine_id: routineId,
              product_id: row.productId,
              sort_order: i,
              updated_at: now,
            })
          }
        }
      }
      setFormRoutine(null)
      await fetchRoutines()
    },
    [user?.id, formRoutine, fetchRoutines]
  )

  const handleDeleteRoutine = useCallback(
    async (routine: BeautyRoutine) => {
      if (!window.confirm(ru.deleteRoutineConfirm)) return
      await supabase.from('beauty_routines').delete().eq('id', routine.id)
      setFormRoutine(null)
      await fetchRoutines()
    },
    [fetchRoutines]
  )

  const tabs = [
    { id: 'products' as const, label: ru.productsTab },
    { id: 'routines' as const, label: ru.routinesTab },
    { id: 'progress' as const, label: ru.progressTab },
  ]

  const filteredRoutines = filterRoutineType
    ? routinesWithSteps.filter(({ routine }) => routine.type === filterRoutineType)
    : routinesWithSteps

  return (
    <div className="catalog-page beauty-page">
      <header className="catalog-header">
        <h1 className="catalog-header__title">{ru.beautyTitle}</h1>
        <nav className="catalog-header__nav">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`catalog-header__tab${activeTab === id ? ' catalog-header__tab--active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'products' && (
        <>
          <div className="catalog-toolbar">
            <div className="catalog-toolbar__filters">
              <select className="catalog-select" value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
                <option value="">{ru.productArea}: {ru.filterAll}</option>
                <option value="face">{ru.productAreaFace}</option>
                <option value="hair">{ru.productAreaHair}</option>
                <option value="body">{ru.productAreaBody}</option>
              </select>
              <select className="catalog-select" value={filterTime} onChange={(e) => setFilterTime(e.target.value)}>
                <option value="">{ru.productTimeOfDay}: {ru.filterAll}</option>
                <option value="morning">{ru.productTimeMorning}</option>
                <option value="evening">{ru.productTimeEvening}</option>
                <option value="anytime">{ru.productTimeAnytime}</option>
              </select>
            </div>
            <div className="catalog-toolbar__actions">
              <button type="button" className="btn-primary" onClick={() => setFormProduct('new')}>
                {ru.addProduct}
              </button>
            </div>
          </div>
          {filteredProducts.length === 0 ? (
            <div className="catalog-empty">
              <div className="catalog-empty__shape" />
              {products.length === 0 ? ru.noProducts : ru.noProductsFilter}
            </div>
          ) : (
            <div className="catalog-grid">
              {filteredProducts.map((product) => (
                <BeautyProductCard key={product.id} product={product} onEdit={setFormProduct} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'routines' && (
        <>
          <div className="catalog-toolbar">
            <div className="catalog-toolbar__filters">
              <select className="catalog-select" value={filterRoutineType} onChange={(e) => setFilterRoutineType(e.target.value)}>
                <option value="">Тип: все</option>
                <option value="morning">{ru.routineTypeMorning}</option>
                <option value="evening">{ru.routineTypeEvening}</option>
                <option value="hair">{ru.routineTypeHair}</option>
                <option value="custom">{ru.routineTypeCustom}</option>
              </select>
            </div>
            <div className="catalog-toolbar__actions">
              <button type="button" className="btn-primary" onClick={() => setFormRoutine('new')}>
                {ru.addRoutine}
              </button>
            </div>
          </div>
          {filteredRoutines.length === 0 ? (
            <div className="catalog-empty">
              <div className="catalog-empty__shape" />
              {routinesWithSteps.length === 0 ? ru.noRoutines : ru.noProductsFilter}
            </div>
          ) : (
            <div className="catalog-list">
              {filteredRoutines.map(({ routine, stepsWithProduct }) => (
                <BeautyRoutineCard
                  key={routine.id}
                  routine={routine}
                  stepsWithProduct={stepsWithProduct}
                  onEdit={setFormRoutine}
                  onDelete={handleDeleteRoutine}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'progress' && (
        <>
          <p className="beauty-header__subtitle">{ru.progressSubtitle}</p>
          <div className="beauty-actions beauty-progress-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => setProgressUploadArea('face')}
            >
              {ru.uploadFacePhoto}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setProgressUploadArea('hair')}
            >
              {ru.uploadHairPhoto}
            </button>
          </div>
          {progressUploadArea && (
            <div className="card beauty-progress-upload">
              <h3 className="beauty-progress-upload__title">
                {progressUploadArea === 'face' ? ru.uploadFacePhoto : ru.uploadHairPhoto}
              </h3>
              <div className="form-group">
                <label>{ru.progressRelatedRoutine}</label>
                <select
                  className="ds-select"
                  value={progressUploadRoutineId}
                  onChange={(e) => setProgressUploadRoutineId(e.target.value)}
                >
                  <option value="">{ru.progressNoRoutine}</option>
                  {routinesWithSteps.map(({ routine }) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{ru.progressPickDate}</label>
                <input
                  type="date"
                  value={progressUploadDate}
                  onChange={(e) => setProgressUploadDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{ru.progressNotes}</label>
                <textarea
                  value={progressUploadNotes}
                  onChange={(e) => setProgressUploadNotes(e.target.value)}
                  placeholder={ru.progressNotesPlaceholder}
                  rows={2}
                />
              </div>
              {photoCategories.length > 0 && (
                <div className="form-group">
                  <label>Категория</label>
                  <select
                    className="ds-select"
                    value={progressUploadCategory}
                    onChange={(e) => setProgressUploadCategory(e.target.value)}
                  >
                    <option value="">— без категории —</option>
                    {photoCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              {progressUploadArea === 'face' && (
                <div className="form-group">
                  <label>{ru.progressFaceCondition}</label>
                  <div className="beauty-progress-ratings">
                    {RATING_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`beauty-progress-rating-btn ${progressUploadFaceRating === opt.value ? 'beauty-progress-rating-btn--active' : ''}`}
                        onClick={() => setProgressUploadFaceRating(progressUploadFaceRating === opt.value ? '' : opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {progressUploadArea === 'hair' && (
                <>
                  <div className="form-group">
                    <label>{ru.progressHairQuality}</label>
                    <div className="beauty-progress-ratings">
                      {RATING_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`beauty-progress-rating-btn ${progressUploadHairQuality === opt.value ? 'beauty-progress-rating-btn--active' : ''}`}
                          onClick={() => setProgressUploadHairQuality(progressUploadHairQuality === opt.value ? '' : opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>{ru.progressHairLengthFeeling}</label>
                    <div className="beauty-progress-ratings">
                      {RATING_OPTIONS.filter((o) => o.value !== '').map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`beauty-progress-rating-btn ${progressUploadHairLength === opt.value ? 'beauty-progress-rating-btn--active' : ''}`}
                          onClick={() => setProgressUploadHairLength(progressUploadHairLength === opt.value ? '' : opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="form-group">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => setProgressUploadFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="beauty-progress-upload__actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setProgressUploadArea(null)
                    setProgressUploadNotes('')
                    setProgressUploadFile(null)
                    setProgressUploadRoutineId('')
                    setProgressUploadFaceRating('')
                    setProgressUploadHairQuality('')
                    setProgressUploadHairLength('')
                  }}
                >
                  {ru.cancel}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!progressUploadFile || progressUploading}
                  onClick={async () => {
                    if (!progressUploadFile || !progressUploadArea) return
                    setProgressUploading(true)
                    try {
                      await handleUploadProgress(
                        progressUploadArea,
                        progressUploadFile,
                        progressUploadDate,
                        progressUploadNotes,
                        progressUploadRoutineId || null,
                        progressUploadFaceRating || null,
                        progressUploadHairQuality || null,
                        progressUploadHairLength || null,
                        progressUploadCategory || null
                      )
                    } catch (err) {
                      console.error(err)
                    } finally {
                      setProgressUploading(false)
                    }
                  }}
                >
                  {progressUploading ? ru.progressUploading : ru.save}
                </button>
              </div>
            </div>
          )}
          <div className="beauty-filters">
            <select
              className="beauty-filters__select ds-select"
              value={filterProgressArea}
              onChange={(e) => setFilterProgressArea(e.target.value)}
              aria-label={ru.productArea}
            >
              <option value="">{ru.filterAll}</option>
              <option value="face">{ru.progressAreaFace}</option>
              <option value="hair">{ru.progressAreaHair}</option>
            </select>
          </div>
          {/* Gallery edit form */}
          {editingProgressPhoto && (
            <div className="card beauty-progress-upload">
              <h3 className="beauty-progress-upload__title">{ru.progressEdit}</h3>
              <div className="form-group">
                <label>{ru.progressRelatedRoutine}</label>
                <select className="ds-select" value={editingProgressPhoto.routine_id ?? ''} onChange={(e) => setEditingProgressPhoto((p) => (p ? { ...p, routine_id: e.target.value || null } : null))}>
                  <option value="">{ru.progressNoRoutine}</option>
                  {routinesWithSteps.map(({ routine }) => <option key={routine.id} value={routine.id}>{routine.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{ru.progressNotes}</label>
                <textarea value={editingProgressPhoto.notes ?? ''} onChange={(e) => setEditingProgressPhoto((p) => (p ? { ...p, notes: e.target.value } : null))} placeholder={ru.progressNotesPlaceholder} rows={2} />
              </div>
              {photoCategories.length > 0 && (
                <div className="form-group">
                  <label>Категория</label>
                  <select className="ds-select" value={editingProgressPhoto.note_category ?? ''} onChange={(e) => setEditingProgressPhoto((p) => (p ? { ...p, note_category: e.target.value || null } : null))}>
                    <option value="">— без категории —</option>
                    {photoCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div className="beauty-progress-upload__actions">
                <button type="button" className="btn-ghost" onClick={() => setEditingProgressPhoto(null)}>{ru.cancel}</button>
                <button type="button" className="btn-primary" onClick={async () => {
                  if (!editingProgressPhoto) return
                  try {
                    await handleUpdateProgress(
                      editingProgressPhoto.id, editingProgressPhoto.notes ?? '',
                      editingProgressPhoto.routine_id ?? null,
                      editingProgressPhoto.area === 'face' ? (editingProgressPhoto.face_condition_rating ?? null) : null,
                      editingProgressPhoto.area === 'hair' ? (editingProgressPhoto.hair_quality_rating ?? null) : null,
                      editingProgressPhoto.area === 'hair' ? (editingProgressPhoto.hair_length_feeling_rating ?? null) : null,
                      editingProgressPhoto.area, editingProgressPhoto.note_category ?? null
                    )
                  } catch (err) { console.error(err) }
                }}>{ru.save}</button>
              </div>
            </div>
          )}

          {/* Photo gallery */}
          {progressPhotos.filter((p) => !filterProgressArea || p.area === filterProgressArea).length === 0 ? (
            <div className="empty-state">{ru.noProgressPhotos}</div>
          ) : (
            <div className="beauty-progress-gallery">
              {progressPhotos.filter((p) => !filterProgressArea || p.area === filterProgressArea).map((photo) => (
                <div key={photo.id} className="beauty-progress-card">
                  <img src={photo.photo_url} alt="" className="beauty-progress-card__img" />
                  <div className="beauty-progress-card__meta">
                    <span className="beauty-progress-card__date">
                      {photo.entry_date ? new Date(photo.entry_date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                    <span className="beauty-progress-card__area">{photo.area === 'face' ? ru.progressAreaFace : ru.progressAreaHair}</span>
                  </div>
                  {photo.note_category && <span className="progress-note-pill">{photo.note_category}</span>}
                  {photo.routine_name && <p className="beauty-progress-card__routine">{photo.routine_name}</p>}
                  {photo.notes && <p className="beauty-progress-card__notes">{photo.notes}</p>}
                  <div className="beauty-progress-card__actions">
                    <button type="button" className="catalog-card__btn" onClick={() => setEditingProgressPhoto(photo)} aria-label={ru.progressEdit}><Pencil size={14} /></button>
                    <button type="button" className="catalog-card__btn catalog-card__btn--delete" onClick={() => handleDeleteProgress(photo)} aria-label={ru.delete}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Категории заметок ────────────────────────── */}
          <div className="progress-section-card">
            <p className="progress-section-label">Категории заметок</p>
            <div className="progress-cats">
              {photoCategories.map((cat) => (
                <span key={cat} className="progress-cat-pill">
                  {cat}
                  <button type="button" className="progress-cat-pill__remove" onClick={() => removeCategory(cat)} aria-label="Удалить">✕</button>
                </span>
              ))}
              <form onSubmit={(e) => { e.preventDefault(); addCategory(newCategoryInput) }} className="progress-cat-add">
                <input value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} placeholder="Новая категория..." className="progress-cat-add__input" />
                <button type="submit" className="progress-cat-add__btn">+</button>
              </form>
            </div>
          </div>

          {/* ── Дневник (таймлайн заметок) ───────────────── */}
          <div className="progress-section-card">
            <p className="progress-section-label">Дневник</p>

            {/* Фильтры */}
            <div className="progress-diary-filters">
              {(['', 'face', 'hair'] as const).map((v) => (
                <button key={v} type="button" className={`progress-diary-filter-btn${filterDiaryType === v ? ' active' : ''}`} onClick={() => setFilterDiaryType(v)}>
                  {v === '' ? 'Все' : v === 'face' ? 'Лицо' : 'Волосы'}
                </button>
              ))}
              {photoCategories.length > 0 && (
                <select className="catalog-select" style={{ marginLeft: 8 }} value={filterDiaryCategory} onChange={(e) => setFilterDiaryCategory(e.target.value)}>
                  <option value="">Все категории</option>
                  {photoCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>

            {/* Таймлайн */}
            {(() => {
              const diaryEntries = progressPhotos
                .filter((p) => p.notes)
                .filter((p) => !filterDiaryType || p.area === filterDiaryType)
                .filter((p) => !filterDiaryCategory || p.note_category === filterDiaryCategory)
              if (diaryEntries.length === 0) return <p className="progress-diary-empty">Нет записей</p>
              return (
                <div className="progress-diary-timeline">
                  {diaryEntries.map((photo, idx) => (
                    <div key={photo.id} className="progress-diary-entry">
                      <div className="progress-diary-entry__dot-col">
                        <div className={`progress-diary-entry__dot${photo.notes ? ' has-note' : ''}`} />
                        {idx < diaryEntries.length - 1 && <div className="progress-diary-entry__line" />}
                      </div>
                      <div className="progress-diary-entry__body">
                        <div className="progress-diary-entry__header">
                          <span className="progress-diary-entry__date">
                            {photo.entry_date ? new Date(photo.entry_date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : '—'}
                          </span>
                          <span className="progress-note-pill">{photo.area === 'face' ? 'Лицо' : 'Волосы'}</span>
                          {photo.note_category && <span className="progress-note-pill">{photo.note_category}</span>}
                          <button type="button" className="progress-diary-edit-btn" title="Редактировать"
                            onClick={() => setInlineDiaryEdit({ photoId: photo.id, notes: photo.notes ?? '', category: photo.note_category ?? '' })}>
                            ✎
                          </button>
                        </div>
                        {inlineDiaryEdit?.photoId === photo.id ? (
                          <div className="progress-diary-inline-form">
                            <textarea value={inlineDiaryEdit.notes} onChange={(e) => setInlineDiaryEdit((s) => s ? { ...s, notes: e.target.value } : null)} rows={3} className="progress-diary-textarea" />
                            {photoCategories.length > 0 && (
                              <select className="catalog-select" value={inlineDiaryEdit.category} onChange={(e) => setInlineDiaryEdit((s) => s ? { ...s, category: e.target.value } : null)}>
                                <option value="">— без категории —</option>
                                {photoCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            )}
                            <div className="progress-diary-inline-form__actions">
                              <button type="button" className="btn-primary progress-btn-sm" onClick={async () => {
                                if (!inlineDiaryEdit) return
                                await handleUpdateProgress(photo.id, inlineDiaryEdit.notes, photo.routine_id ?? null,
                                  photo.area === 'face' ? (photo.face_condition_rating ?? null) : null,
                                  photo.area === 'hair' ? (photo.hair_quality_rating ?? null) : null,
                                  photo.area === 'hair' ? (photo.hair_length_feeling_rating ?? null) : null,
                                  photo.area, inlineDiaryEdit.category || null)
                                setInlineDiaryEdit(null)
                              }}>Сохранить</button>
                              <button type="button" className="btn-ghost progress-btn-sm" onClick={() => setInlineDiaryEdit(null)}>Отмена</button>
                            </div>
                          </div>
                        ) : (
                          <p className="progress-diary-entry__note">{photo.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* ── Задачи на будущее ─────────────────────────── */}
          <div className="progress-section-card">
            <p className="progress-section-label">Задачи на будущее</p>
            {/* Active tasks */}
            {futureTasks.filter((t) => !t.completedAt).length === 0 && (
              <p className="progress-diary-empty">Нет активных задач</p>
            )}
            <ul className="future-task-list">
              {futureTasks.filter((t) => !t.completedAt).map((task) => (
                <li key={task.id} className="future-task-item">
                  <button type="button" className="future-task-item__check" onClick={() => toggleFutureTask(task.id)} aria-label="Выполнено" />
                  <span className="future-task-item__text">{task.text}</span>
                  <span className="future-task-item__date">{new Date(task.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                  <button type="button" className="future-task-item__delete" onClick={() => deleteFutureTask(task.id)} aria-label="Удалить">✕</button>
                </li>
              ))}
            </ul>
            {/* Done tasks */}
            {futureTasks.filter((t) => t.completedAt).length > 0 && (
              <>
                <button type="button" className="future-tasks-toggle" onClick={() => setShowDoneFutureTasks((v) => !v)}>
                  Выполнено ({futureTasks.filter((t) => t.completedAt).length}) {showDoneFutureTasks ? '▲' : '▼'}
                </button>
                {showDoneFutureTasks && (
                  <ul className="future-task-list future-task-list--done">
                    {futureTasks.filter((t) => t.completedAt).map((task) => (
                      <li key={task.id} className="future-task-item future-task-item--done">
                        <button type="button" className="future-task-item__check future-task-item__check--done" onClick={() => toggleFutureTask(task.id)} aria-label="Снять" />
                        <span className="future-task-item__text">{task.text}</span>
                        <span className="future-task-item__date">{new Date(task.completedAt!).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                        <button type="button" className="future-task-item__delete" onClick={() => deleteFutureTask(task.id)} aria-label="Удалить">✕</button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {/* Add form */}
            <form className="future-task-add" onSubmit={(e) => { e.preventDefault(); addFutureTask(newFutureTaskText) }}>
              <input value={newFutureTaskText} onChange={(e) => setNewFutureTaskText(e.target.value)} placeholder="Новая задача..." className="future-task-add__input" />
              <button type="submit" className="future-task-add__btn" aria-label="Добавить">+</button>
            </form>
          </div>
        </>
      )}

      {formProduct != null && (
        <BeautyProductForm
          product={formProduct === 'new' ? null : formProduct}
          onSave={handleSave}
          onCancel={() => setFormProduct(null)}
        />
      )}

      {formRoutine != null && (
        <BeautyRoutineForm
          routine={formRoutine === 'new' ? null : formRoutine}
          initialSteps={getInitialStepsForRoutine(formRoutine === 'new' ? null : formRoutine)}
          products={products}
          onSave={handleSaveRoutine}
          onCancel={() => setFormRoutine(null)}
        />
      )}
    </div>
  )
}
