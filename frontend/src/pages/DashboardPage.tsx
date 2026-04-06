import { useEffect, useState, useMemo } from 'react'
import { getTransactions, getFixedCosts, getForecast } from '@/services/api'
import type { Transaction, Category, FixedCost, ForecastMonth } from '@/types'
import type { Route } from '@/App'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  TrendingDown, Receipt, Tag, ArrowRight, Upload,
  ChevronLeft, ChevronRight, Wallet,
} from 'lucide-react'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function addMonths(key: string, delta: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

interface DashboardPageProps {
  onNavigate: (route: Route) => void
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [forecast, setForecast] = useState<ForecastMonth[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isCurrentMonth = selectedMonth === currentMonthKey()
  const selectedYear = parseInt(selectedMonth.split('-')[0])
  const selectedMonthNum = parseInt(selectedMonth.split('-')[1])

  useEffect(() => {
    getForecast().then(setForecast).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getTransactions({ bill_month: `${selectedMonth}-01` }),
      getFixedCosts(selectedYear),
    ])
      .then(([txns, costs]) => {
        setTransactions(txns)
        setFixedCosts(costs)
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [selectedMonth]) // eslint-disable-line react-hooks/exhaustive-deps

  const variableTotal = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions],
  )

  // Effective fixed cost amount for the selected month
  const fixedCostItems = useMemo(
    () =>
      fixedCosts.map((cost) => {
        const override = cost.overrides.find((o) => o.month === selectedMonthNum)
        return {
          id: cost.id,
          name: cost.name,
          effectiveAmount: override ? override.amount : cost.amount,
          isOverridden: !!override,
        }
      }),
    [fixedCosts, selectedMonthNum],
  )

  const fixedTotal = useMemo(
    () => fixedCostItems.reduce((sum, c) => sum + c.effectiveAmount, 0),
    [fixedCostItems],
  )

  const spendingByCategory = useMemo(() => {
    const map = new Map<string, { category: Category; total: number; count: number }>()
    for (const t of transactions) {
      if (!t.category || !t.category_id) continue
      const entry = map.get(t.category_id)
      if (entry) {
        entry.total += t.amount
        entry.count++
      } else {
        map.set(t.category_id, { category: t.category, total: t.amount, count: 1 })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [transactions])

  const topCategory = spendingByCategory[0]
  const maxCategoryAmount = spendingByCategory[0]?.total ?? 1
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedMonth((m) => addMonths(m, -1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="w-40 text-center text-sm font-medium capitalize">
            {monthLabel(selectedMonth)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
            disabled={isCurrentMonth}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
        {transactions.length === 0 && (
          <Button onClick={() => onNavigate('import')} size="sm">
            <Upload />
            Import CSV
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Variable
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(variableTotal)}
                </p>
                <p className="text-xs text-muted-foreground">{transactions.length} transactions</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <TrendingDown size={16} className="text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Fixed
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(fixedTotal)}
                </p>
                <p className="text-xs text-muted-foreground">{fixedCostItems.length} costs</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <Wallet size={16} className="text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {formatCurrency(variableTotal + fixedTotal)}
                </p>
                <p className="text-xs text-muted-foreground">variable + fixed</p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                <Receipt size={16} className="text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Top category
                </p>
                <p className="text-2xl font-semibold text-foreground">
                  {topCategory?.category.name ?? '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {topCategory ? formatCurrency(topCategory.total) : 'no data yet'}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted">
                {topCategory?.category.icon
                  ? <span className="text-base">{topCategory.category.icon}</span>
                  : <Tag size={16} className="text-muted-foreground" />
                }
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variable + Fixed breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {/* Spending by category */}
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
          </CardHeader>
          <CardContent>
            {spendingByCategory.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <p className="text-sm text-muted-foreground">No categorized transactions</p>
                <Button variant="outline" size="sm" onClick={() => onNavigate('import')}>
                  <Upload />
                  Import CSV
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {spendingByCategory.map(({ category, total, count }) => (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <span>{category.icon}</span>
                        <span className="font-medium text-foreground">{category.name}</span>
                        <span className="text-muted-foreground">
                          {count} {count === 1 ? 'tx' : 'txs'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-foreground">
                        {formatCurrency(total)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(total / maxCategoryAmount) * 100}%`,
                          backgroundColor: category.color ?? 'hsl(var(--primary))',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fixed costs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Fixed costs</CardTitle>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onNavigate('fixed-costs')}
              >
                Manage
                <ArrowRight />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {fixedCostItems.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <p className="text-sm text-muted-foreground">No fixed costs for {selectedYear}</p>
                <Button variant="outline" size="sm" onClick={() => onNavigate('fixed-costs')}>
                  <Wallet size={14} />
                  Add fixed costs
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {fixedCostItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                      <span className="text-foreground">{item.name}</span>
                      {item.isOverridden && (
                        <span className="text-xs text-primary">(adjusted)</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(item.effectiveAmount)}
                    </span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Total</span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(fixedTotal)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Installment forecast */}
      {forecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Installment forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 items-stretch">
              {forecast.slice(0, 3).map((fm) => {
                const [y, m] = fm.month.split('-').map(Number)
                const label = `${String(m).padStart(2, '0')}/${String(y).slice(-2)}`
                return (
                  <div key={fm.month} className="flex flex-col gap-2 h-full">
                    <span className="text-sm font-bold text-foreground capitalize">
                      {label}
                    </span>
                    <div className="flex-1 space-y-1.5">
                      {fm.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="flex-1 flex items-center gap-1 min-w-0">
                            <span className="truncate text-foreground" title={item.description}>
                              {item.description}
                            </span>
                            <span className="flex-shrink-0 text-muted-foreground">{item.installment}</span>
                          </span>
                          <span className="flex-shrink-0 font-medium text-foreground">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between border-t pt-1.5 mt-auto">
                      <span className="text-xs text-muted-foreground">Total</span>
                      <span className="text-sm font-semibold text-foreground">{formatCurrency(fm.total)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent transactions</CardTitle>
            {transactions.length > 0 && (
              <Button variant="ghost" size="xs" onClick={() => onNavigate('transactions')}>
                See all
                <ArrowRight />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-muted-foreground">No transactions</p>
              <Button variant="outline" size="sm" onClick={() => onNavigate('import')}>
                <Upload />
                Import CSV
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTransactions.map((t, i) => (
                <div key={t.id}>
                  <div className="flex items-center gap-3 py-2">
                    <div
                      className="h-8 w-8 flex-shrink-0 rounded-lg flex items-center justify-center text-sm"
                      style={{
                        backgroundColor: t.category?.color
                          ? `${t.category.color}18`
                          : 'oklch(var(--muted))',
                      }}
                    >
                      {t.category?.icon ?? '💳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {t.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.date)}
                        {t.category && <span className="mx-1">·</span>}
                        {t.category?.name}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-foreground flex-shrink-0">
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                  {i < recentTransactions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
