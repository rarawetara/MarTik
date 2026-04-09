import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ru } from './constants/ru'
import { getSupabaseEnv } from './lib/supabaseEnv'
import './index.css'
import './design-system.css'

const { ok, issue } = getSupabaseEnv()

function EnvMissingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '2rem',
        maxWidth: 520,
        margin: '0 auto',
        fontFamily: 'system-ui, sans-serif',
        lineHeight: 1.5,
        color: '#1a1a1a',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', marginBottom: 12 }}>{ru.envMissingTitle}</h1>
      {issue === 'postgres_string' && (
        <p style={{ color: '#b42318', marginBottom: 16, fontWeight: 600 }}>{ru.envWrongPostgresUrl}</p>
      )}
      {issue === 'vars_swapped' && (
        <p style={{ color: '#b42318', marginBottom: 16, fontWeight: 600 }}>{ru.envVarsSwapped}</p>
      )}
      {issue === 'missing_key' && (
        <p style={{ color: '#b42318', marginBottom: 16, fontWeight: 600 }}>{ru.envMissingAnonKey}</p>
      )}
      {issue === 'invalid_url' && (
        <p style={{ color: '#b42318', marginBottom: 16, fontWeight: 600 }}>{ru.envMissingUrl}</p>
      )}
      <p style={{ color: '#444', marginBottom: 12 }}>{ru.envMissingBody}</p>
      <p style={{ color: '#444', marginBottom: 12 }}>{ru.envMissingVars}</p>
      <p style={{ color: '#666', fontSize: 14 }}>{ru.envMissingLocal}</p>
    </div>
  )
}

if (!ok) {
  createRoot(document.getElementById('root')!).render(<EnvMissingScreen />)
} else {
  void import('./App').then(({ default: App }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    )
  })
}
