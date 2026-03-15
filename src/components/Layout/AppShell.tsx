import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppShell() {
  return (
    <div className="app-shell">
      <main className="main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
