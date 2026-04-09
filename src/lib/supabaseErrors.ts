/** sessionStorage: skip further HTTP requests to `task_templates` after a confirmed missing table (per user). */
export const TASK_TEMPLATES_MISSING_STORAGE_KEY = 'martik_task_templates_missing'

function storageKey(userId: string) {
  return `${TASK_TEMPLATES_MISSING_STORAGE_KEY}:${userId}`
}

export function readTemplatesMissingFromStorage(userId: string | undefined): boolean {
  if (!userId) return false
  try {
    return sessionStorage.getItem(storageKey(userId)) === '1'
  } catch {
    return false
  }
}

export function persistTemplatesMissingToStorage(userId: string): void {
  try {
    sessionStorage.setItem(storageKey(userId), '1')
  } catch {
    /* ignore */
  }
}

export function clearTemplatesMissingFromStorage(userId: string): void {
  try {
    sessionStorage.removeItem(storageKey(userId))
  } catch {
    /* ignore */
  }
}

/**
 * Detect PostgREST / Postgres errors when a relation is missing (migration not applied).
 */
export function isMissingTableError(error: {
  code?: string
  message?: string
  details?: string
  hint?: string
} | null): boolean {
  if (!error) return false
  const code = (error.code ?? '').toUpperCase()
  const msg = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  if (code === 'PGRST205') return true
  if (code === '42P01') return true
  if (msg.includes('could not find the table') && msg.includes('schema cache')) return true
  if (msg.includes('relation') && msg.includes('does not exist')) return true
  if (msg.includes('task_templates') && (msg.includes('not found') || msg.includes('schema cache') || msg.includes('does not exist')))
    return true
  return false
}
