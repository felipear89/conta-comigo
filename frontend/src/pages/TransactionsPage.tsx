import { useEffect, useState, useCallback, useRef } from 'react'
import { getTransactions, getCategories, updateTransactionCategory, deleteTransactions } from '@/services/api'
import type { Transaction, Category } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, X, Trash2, Check } from 'lucide-react'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatBillMonth(billMonth: string | null): string {
  if (!billMonth) return ''
  return new Date(billMonth + 'T00:00:00').toLocaleDateString('pt-BR', {
    month: 'short',
    year: 'numeric',
  })
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [billMonth, setBillMonth] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const headerCheckboxRef = useRef<HTMLInputElement>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelectedIds(new Set())
    setConfirmDelete(false)
    try {
      const txns = await getTransactions({
        category_id: categoryFilter === 'all' ? undefined : categoryFilter,
        bill_month: billMonth ? `${billMonth}-01` : undefined,
      })
      setTransactions(txns)
    } catch {
      setError('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, billMonth])

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const filtered = search
    ? transactions.filter((t) =>
        t.description.toLowerCase().includes(search.toLowerCase()),
      )
    : transactions

  // Reset selection when filtered list changes (e.g. after search)
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const visibleIds = new Set(filtered.map((t) => t.id))
      const next = new Set([...prev].filter((id) => visibleIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [filtered])

  // Keep header checkbox indeterminate state in sync
  useEffect(() => {
    if (!headerCheckboxRef.current) return
    const allSelected = filtered.length > 0 && selectedIds.size === filtered.length
    const someSelected = selectedIds.size > 0 && selectedIds.size < filtered.length
    headerCheckboxRef.current.checked = allSelected
    headerCheckboxRef.current.indeterminate = someSelected
  }, [selectedIds, filtered])

  const totalFiltered = filtered.reduce((sum, t) => sum + t.amount, 0)
  const hasActiveFilters = !!(search || categoryFilter !== 'all' || billMonth)

  function toggleAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)))
    }
    setConfirmDelete(false)
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setConfirmDelete(false)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const ids = [...selectedIds]
      await deleteTransactions(ids)
      setTransactions((prev) => prev.filter((t) => !selectedIds.has(t.id)))
      setSelectedIds(new Set())
      setConfirmDelete(false)
    } catch {
      setError('Failed to delete transactions')
    } finally {
      setDeleting(false)
    }
  }

  async function handleCategoryChange(transactionId: string, categoryId: string) {
    setUpdatingId(transactionId)
    try {
      await updateTransactionCategory(transactionId, categoryId)
      const category = categoryId ? categories.find((c) => c.id === categoryId) : undefined
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === transactionId
            ? { ...t, category_id: categoryId || null, category }
            : t,
        ),
      )
    } catch {
      // silently ignore; user can retry
    } finally {
      setUpdatingId(null)
      setEditingId(null)
    }
  }

  function clearFilters() {
    setSearch('')
    setCategoryFilter('all')
    setBillMonth('')
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Transactions</h1>
        {!loading && (
          <p className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}
            {filtered.length > 0 && ` · ${formatCurrency(totalFiltered)}`}
          </p>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Search descriptions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Input
          type="month"
          value={billMonth}
          onChange={(e) => setBillMonth(e.target.value)}
          className="w-40"
        />

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.icon} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X />
            Clear
          </Button>
        )}
      </div>

      {/* Selection toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} {selectedIds.size === 1 ? 'transaction' : 'transactions'} selected
          </span>

          <div className="ml-auto flex items-center gap-2">
            {confirmDelete ? (
              <>
                <span className="text-sm text-destructive font-medium">
                  Delete {selectedIds.size} {selectedIds.size === 1 ? 'transaction' : 'transactions'}?
                </span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Check size={14} />
                  )}
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} />
                  Delete selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setSelectedIds(new Set()); setConfirmDelete(false) }}
                >
                  Clear selection
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTransactions}>
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <p className="text-sm text-muted-foreground">No transactions found.</p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 px-4">
                  <input
                    ref={headerCheckboxRef}
                    type="checkbox"
                    className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
                    onChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="w-32 px-4">Date</TableHead>
                <TableHead className="w-28 px-4">Bill</TableHead>
                <TableHead className="px-4">Description</TableHead>
                <TableHead className="w-52 px-4">Category</TableHead>
                <TableHead className="w-24 px-4 text-center">Installment</TableHead>
                <TableHead className="w-36 px-4 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  categories={categories}
                  isEditing={editingId === t.id}
                  isUpdating={updatingId === t.id}
                  isSelected={selectedIds.has(t.id)}
                  onToggle={() => toggleOne(t.id)}
                  onEditStart={() => setEditingId(t.id)}
                  onEditEnd={() => setEditingId(null)}
                  onCategoryChange={(catId) => handleCategoryChange(t.id, catId)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function TransactionRow({
  transaction: t,
  categories,
  isEditing,
  isUpdating,
  isSelected,
  onToggle,
  onEditStart,
  onEditEnd,
  onCategoryChange,
}: {
  transaction: Transaction
  categories: Category[]
  isEditing: boolean
  isUpdating: boolean
  isSelected: boolean
  onToggle: () => void
  onEditStart: () => void
  onEditEnd: () => void
  onCategoryChange: (categoryId: string) => void
}) {
  return (
    <TableRow className={isSelected ? 'bg-primary/5' : ''}>
      <TableCell className="px-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="h-4 w-4 rounded border-border cursor-pointer accent-primary"
        />
      </TableCell>

      <TableCell className="px-4 text-muted-foreground whitespace-nowrap">
        {formatDate(t.date)}
      </TableCell>

      <TableCell className="px-4 text-muted-foreground whitespace-nowrap">
        {formatBillMonth(t.bill_month)}
      </TableCell>

      <TableCell className="px-4 font-medium text-foreground">
        {t.description}
      </TableCell>

      <TableCell className="px-4">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Select
              defaultValue={t.category_id ?? ''}
              onValueChange={(val) => onCategoryChange(val)}
              disabled={isUpdating}
            >
              <SelectTrigger
                size="sm"
                className="w-44"
                onBlur={onEditEnd}
              >
                <SelectValue placeholder="Uncategorized" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Uncategorized</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isUpdating && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>
        ) : t.category ? (
          <button
            onClick={onEditStart}
            title="Click to change category"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-opacity hover:opacity-70"
            style={{
              backgroundColor: `${t.category.color}15`,
              color: t.category.color,
              borderColor: `${t.category.color}30`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: t.category.color }}
            />
            {t.category.name}
          </button>
        ) : (
          <button
            onClick={onEditStart}
            title="Click to change category"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-border bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
          >
            Uncategorized
          </button>
        )}
      </TableCell>

      <TableCell className="px-4 text-center">
        {t.installment ? (
          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {t.installment}
          </span>
        ) : null}
      </TableCell>

      <TableCell className="px-4 text-right font-medium text-foreground whitespace-nowrap">
        {formatCurrency(t.amount)}
      </TableCell>
    </TableRow>
  )
}
