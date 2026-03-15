import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ru } from '../constants/ru'

type Mode = 'login' | 'signup'

function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('already') && (m.includes('registered') || m.includes('exists'))) return ru.errorUserExists
  if (m.includes('rate') || m.includes('429') || m.includes('too many')) return ru.errorRateLimit
  if (m.includes('invalid') || m.includes('credentials') || m.includes('email') && m.includes('password')) return ru.errorInvalidLogin
  return ru.authError
}

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (mode === 'signup' && password !== confirmPassword) {
      setError(ru.passwordsMismatch)
      return
    }
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) setError(mapAuthError(err.message))
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) {
          setError(mapAuthError(err.message))
          return
        }
        if (data?.user) {
          if (data.user.identities && data.user.identities.length === 0) {
            setError(ru.errorUserExists)
          } else {
            setSuccess(ru.signupSuccessConfirmEmail)
          }
        }
      }
    } catch {
      setError(ru.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="main" style={{ paddingTop: 48 }}>
      <div className="card" style={{ maxWidth: 360, margin: '0 auto' }}>
        <h1 style={{ marginTop: 0 }}>{ru.appName}</h1>
        <p style={{ color: '#666', marginBottom: 24 }}>
          {mode === 'login' ? ru.loginPrompt : ru.signUpPrompt}
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{ru.email}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">{ru.password}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="confirmPassword">{ru.confirmPassword}</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          )}
          {error && (
            <p style={{ color: '#c00', fontSize: '0.875rem', marginBottom: 16 }}>{error}</p>
          )}
          {success && (
            <p style={{ color: '#2d5a4a', fontSize: '0.875rem', marginBottom: 16 }}>{success}</p>
          )}
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
            {loading ? ru.loading : mode === 'login' ? ru.login : ru.signUp}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: '0.875rem', color: '#666' }}>
          {mode === 'login' ? (
            <>
              {ru.noAccount}{' '}
              <button type="button" onClick={() => { setMode('signup'); setError(null); setSuccess(null); }} className="btn-ghost" style={{ padding: 0, border: 'none', textDecoration: 'underline' }}>
                {ru.signUp}
              </button>
            </>
          ) : (
            <>
              {ru.hasAccount}{' '}
              <button type="button" onClick={() => { setMode('login'); setError(null); setSuccess(null); }} className="btn-ghost" style={{ padding: 0, border: 'none', textDecoration: 'underline' }}>
                {ru.login}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
