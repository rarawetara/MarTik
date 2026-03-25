import { Outlet } from 'react-router-dom'
import { SideNav } from './SideNav'
import { GlobalTaskFAB } from '../GlobalTaskFAB'

export function AppShell() {
  return (
    <div className="app-shell">
      <SideNav />
      <div className="app-shell__content">
        <main className="main">
          <Outlet />
        </main>
      </div>
      <GlobalTaskFAB />
    </div>
  )
}
