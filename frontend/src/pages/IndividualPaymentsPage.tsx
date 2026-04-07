import { useEffect, useMemo, useState } from 'react'
import {
  getIndividualPayments,
  createIndividualPayment,
  updateIndividualPayment,
  deleteIndividualPayment,
  getCategories,
} from '@/services/api'
import type { Category, IndividualPayment } from '@/types'
import type { Route } from '@/App'
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
import { Separator } from '@/components/ui/separator'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

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

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function monthBounds(key: string) {
  const [y, m] = key.split('-').map(Number)
  return {
    start: isoDate(new Date(y, m - 1, 1)),
    end: isoDate(new Date(y, m, 0)),
  }
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

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
}

interface IndividualPaymentsPageProps {
  onNavigate: (route: Route) => void
}

export function IndividualPaymentsPage({ onNavigate: _onNavigate }: IndividualPaymentsPageProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)
  const [payments, setPayments] = useState<IndividualPayment[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewRow, setShowNewRow] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const isCurrentMonth = selectedMonth === currentMonthKey()

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    const { start, end } = monthBounds(selectedMonth)
    getIndividualPayments({ date_from: start, date_to: end })
      .then(setPayments)
      .catch(() => setError('Failed to load payments'))
      .finally(() => setLoading(false))
  }, [selectedMonth])

  const total = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments])

  async function handleCreate(data: {
    description: string
    amount: number
    date: string
    category_id: string | null
  }) {
    try {
      const created = await createIndividualPayment(data)
      setPayments((prev) => [created, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      setShowNewRow(false)
    } catch {
      setError('Failed to create payment')
    }
  }

  async function handleUpdate(
    id: string,
    data: Partial<{ description: string; amount: number; date: string; category_id: string | null }>,
  ) {
    try {
      const updated = await updateIndividualPayment(id, data)
      setPayments((prev) => prev.map((p) => (p.id === id ? updated : p)))
      setEditingId(null)
    } catch {
      setError('Failed to update payment')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteIndividualPayment(id)
      setPayments((prev) => prev.filter((p) => p.id !== id))
      setConfirmDeleteId(null)
    } catch {
      setError('Failed to delete payment')
    }
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Individual Payments</h1>
        <div className="flex items-center gap-3">
          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setSelectedMonth((m) => addMonths(m, -1))}>
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

          <Button size="sm" onClick={() => { setShowNewRow(true); setEditingId(null) }}>
            <Plus size={14} />
            Add payment
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 w-36">Date</TableHead>
              <TableHead className="px-4">Description</TableHead>
              <TableHead className="px-4 w-44">Category</TableHead>
              <TableHead className="px-4 w-32 text-right">Amount</TableHead>
              <TableHead className="px-4 w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* New row */}
            {showNewRow && (
              <NewPaymentRow
                selectedMonth={selectedMonth}
                categories={categories}
                onSave={handleCreate}
                onCancel={() => setShowNewRow(false)}
              />
            )}

            {/* Empty state */}
            {!loading && payments.length === 0 && !showNewRow && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                  No payments for this month
                </TableCell>
              </TableRow>
            )}

            {/* Rows */}
            {payments.map((payment) =>
              editingId === payment.id ? (
                <EditPaymentRow
                  key={payment.id}
                  payment={payment}
                  categories={categories}
                  onSave={(data) => handleUpdate(payment.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <TableRow key={payment.id}>
                  <TableCell className="px-4 text-muted-foreground whitespace-nowrap">
                    {formatDate(payment.date)}
                  </TableCell>
                  <TableCell className="px-4 font-medium text-foreground">
                    {payment.description}
                  </TableCell>
                  <TableCell className="px-4">
                    {payment.category ? (
                      <span className="text-sm text-muted-foreground">
                        {payment.category.icon} {payment.category.name}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 text-right font-medium text-foreground">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="px-4">
                    <div className="flex items-center justify-end gap-1">
                      {confirmDeleteId === payment.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDelete(payment.id)}
                          >
                            <Check size={14} className="text-destructive" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            <X size={14} />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => { setEditingId(payment.id); setShowNewRow(false) }}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setConfirmDeleteId(payment.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}

            {/* Total row */}
            {payments.length > 0 && (
              <TableRow className="bg-muted/30 font-medium">
                <TableCell colSpan={3} className="px-4">
                  <Separator className="hidden" />
                  Total
                </TableCell>
                <TableCell className="px-4 text-right font-semibold text-foreground">
                  {formatCurrency(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── New payment row ──────────────────────────────────────────────────────────

function NewPaymentRow({
  selectedMonth,
  categories,
  onSave,
  onCancel,
}: {
  selectedMonth: string
  categories: Category[]
  onSave: (data: { description: string; amount: number; date: string; category_id: string | null }) => void
  onCancel: () => void
}) {
  const defaultDate = `${selectedMonth}-01`
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [categoryId, setCategoryId] = useState<string | null>(null)

  function handleSubmit() {
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!description.trim() || isNaN(parsed) || parsed <= 0 || !date) return
    onSave({ description: description.trim(), amount: parsed, date, category_id: categoryId })
  }

  return (
    <TableRow className="bg-muted/20">
      <TableCell className="px-4">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-7 text-sm w-full"
        />
      </TableCell>
      <TableCell className="px-4">
        <Input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-7 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
          autoFocus
        />
      </TableCell>
      <TableCell className="px-4">
        <Select value={categoryId ?? '__none__'} onValueChange={(v) => setCategoryId(v === '__none__' ? null : v)}>
          <SelectTrigger className="h-7 text-sm w-full">
            <SelectValue placeholder="— none —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— none —</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="px-4">
        <Input
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-7 text-sm text-right"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
        />
      </TableCell>
      <TableCell className="px-4">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleSubmit}
            disabled={!description.trim() || !amount || !date}
          >
            <Check size={14} className="text-primary" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onCancel}>
            <X size={14} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── Edit payment row ─────────────────────────────────────────────────────────

function EditPaymentRow({
  payment,
  categories,
  onSave,
  onCancel,
}: {
  payment: IndividualPayment
  categories: Category[]
  onSave: (data: Partial<{ description: string; amount: number; date: string; category_id: string | null }>) => void
  onCancel: () => void
}) {
  const [description, setDescription] = useState(payment.description)
  const [amount, setAmount] = useState(String(payment.amount))
  const [date, setDate] = useState(payment.date)
  const [categoryId, setCategoryId] = useState<string | null>(payment.category_id)

  function handleSave() {
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!description.trim() || isNaN(parsed) || parsed <= 0 || !date) return
    onSave({ description: description.trim(), amount: parsed, date, category_id: categoryId })
  }

  return (
    <TableRow className="bg-muted/30">
      <TableCell className="px-4">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-7 text-sm w-full"
        />
      </TableCell>
      <TableCell className="px-4">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-7 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel() }}
          autoFocus
        />
      </TableCell>
      <TableCell className="px-4">
        <Select value={categoryId ?? '__none__'} onValueChange={(v) => setCategoryId(v === '__none__' ? null : v)}>
          <SelectTrigger className="h-7 text-sm w-full">
            <SelectValue placeholder="— none —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— none —</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="px-4">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-7 text-sm text-right"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onCancel() }}
        />
      </TableCell>
      <TableCell className="px-4">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon-xs" onClick={handleSave}>
            <Check size={14} className="text-primary" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={onCancel}>
            <X size={14} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
