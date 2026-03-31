/** Читает и приводит к виду, который ждёт @supabase/supabase-js (валидный https URL). */

function stripQuotes(s: string): string {
  const t = s.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim()
  }
  return t
}

function normalizeSupabaseUrl(raw: string | undefined): string {
  if (raw == null || typeof raw !== 'string') return ''
  let u = stripQuotes(raw)
  if (!u) return ''
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`
  }
  return u.replace(/\/+$/, '')
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function getSupabaseEnv(): {
  url: string
  anonKey: string
  ok: boolean
} {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  const url = normalizeSupabaseUrl(rawUrl)
  const anonKey = rawKey != null && typeof rawKey === 'string' ? stripQuotes(rawKey) : ''

  const ok = isValidHttpUrl(url) && anonKey.length > 0
  return { url, anonKey, ok }
}
