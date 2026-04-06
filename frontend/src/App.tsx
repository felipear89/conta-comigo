import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { ImportPage } from '@/pages/ImportPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { FixedCostsPage } from '@/pages/FixedCostsPage'
import { LayoutDashboard, ArrowLeftRight, Upload, Tag, LogOut, Wallet } from 'lucide-react'

export type Route = 'dashboard' | 'transactions' | 'import' | 'categories' | 'fixed-costs'

const navItems: { label: string; key: Route; icon: React.ElementType }[] = [
  { label: 'Dashboard', key: 'dashboard', icon: LayoutDashboard },
  { label: 'Transactions', key: 'transactions', icon: ArrowLeftRight },
  { label: 'Credit card statement', key: 'import', icon: Upload },
  { label: 'Categories', key: 'categories', icon: Tag },
  { label: 'Fixed Costs', key: 'fixed-costs', icon: Wallet },
]

export default function App() {
  const { session, loading } = useAuth()
  const [route, setRoute] = useState<Route>('dashboard')

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) return <LoginPage />

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <nav className="flex w-56 flex-shrink-0 flex-col bg-slate-900">
        {/* Logo */}
        <div className="px-4 py-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">C</span>
            </div>
            <span className="font-semibold text-white">Conta Comigo</span>
          </div>
          <p className="text-xs text-white/40 mt-2 truncate pl-px" title={session.user.email ?? ''}>
            {session.user.email}
          </p>
        </div>

        {/* Nav */}
        <ul className="flex-1 px-2 py-4 space-y-1">
          {navItems.map(({ label, key, icon: Icon }) => {
            const active = route === key
            return (
              <li key={key}>
                <button
                  onClick={() => setRoute(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              </li>
            )
          })}
        </ul>

        {/* Sign out */}
        <div className="px-2 pb-4">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </nav>

      {/* Page */}
      <main className="flex-1 overflow-auto">
        {route === 'dashboard' && <DashboardPage onNavigate={setRoute} />}
        {route === 'transactions' && <TransactionsPage />}
        {route === 'import' && (
          <ImportPage
            onImported={() => setRoute('transactions')}
            onGoToCategories={() => setRoute('categories')}
          />
        )}
        {route === 'categories' && <CategoriesPage />}
        {route === 'fixed-costs' && <FixedCostsPage />}
      </main>
    </div>
  )
}
