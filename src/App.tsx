import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { ru } from './constants/ru'
import { AppShell } from './components/Layout/AppShell'
import { LoginPage } from './pages/LoginPage'
import { Home } from './pages/Home'
import { Today } from './pages/Today'
import { Beauty } from './pages/Beauty'
import { Diary } from './pages/Diary'
import { Settings } from './pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <p style={{ padding: 24, textAlign: 'center' }}>{ru.loading}</p>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <p style={{ padding: 24, textAlign: 'center' }}>{ru.loading}</p>
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="today" element={<Today />} />
          <Route path="beauty" element={<Beauty />} />
          <Route path="diary" element={<Diary />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
