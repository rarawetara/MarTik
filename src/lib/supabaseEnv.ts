/** Читает и приводит к виду, который ждёт @supabase/supabase-js (валидный HTTPS API URL). */

function stripQuotes(s: string): string {
  const t = s.trim()
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1).trim()
  }
  return t
}

/** Строка из «Connect to Postgres», не из раздела API — в браузере не работает. */
function looksLikePostgresConnectionString(s: string): boolean {
  const x = s.toLowerCase()
  return (
    /^postgres(ql)?:\/\//i.test(s) ||
    x.includes(':5432') ||
    x.includes('[your-password]') ||
    x.includes('postgres:[')
  )
}

/**
 * Нужен именно HTTPS API: https://<ref>.supabase.co
 * Хост db.<ref>.supabase.co — для прямого Postgres, не для JS-клиента.
 */
function normalizeSupabaseApiUrl(raw: string | undefined): { url: string; error: 'none' | 'postgres_string' | 'invalid' } {
  if (raw == null || typeof raw !== 'string') return { url: '', error: 'invalid' }
  let u = stripQuotes(raw)
  if (!u) return { url: '', error: 'invalid' }

  if (looksLikePostgresConnectionString(u)) {
    return { url: '', error: 'postgres_string' }
  }

  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`
  }
  u = u.replace(/\/+$/, '')

  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { url: '', error: 'invalid' }
    }
    let host = parsed.hostname
    if (host.startsWith('db.') && host.endsWith('.supabase.co')) {
      host = host.slice('db.'.length)
      u = `https://${host}`
    }
    return { url: u, error: 'none' }
  } catch {
    return { url: '', error: 'invalid' }
  }
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export type SupabaseEnvIssue =
  | 'ok'
  | 'missing'
  | 'postgres_string'
  | 'invalid_url'
  | 'missing_key'

export function getSupabaseEnv(): {
  url: string
  anonKey: string
  ok: boolean
  issue: SupabaseEnvIssue
} {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  const { url: normalizedUrl, error: normErr } = normalizeSupabaseApiUrl(rawUrl)
  const anonKey = rawKey != null && typeof rawKey === 'string' ? stripQuotes(rawKey) : ''

  if (normErr === 'postgres_string') {
    return { url: '', anonKey, ok: false, issue: 'postgres_string' }
  }

  const url = normalizedUrl
  if (!anonKey.length) {
    return { url, anonKey, ok: false, issue: 'missing_key' }
  }
  if (!url || !isValidHttpUrl(url)) {
    return { url, anonKey, ok: false, issue: 'invalid_url' }
  }

  return { url, anonKey, ok: true, issue: 'ok' }
}
