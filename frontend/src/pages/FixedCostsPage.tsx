import { useEffect, useRef, useState, useMemo } from 'react'
import {
  getFixedCosts,
  createFixedCost,
  updateFixedCost,
  deleteFixedCost,
  upsertFixedCostOverride,
  deleteFixedCostOverride,
} from '@/services/api'
import type { FixedCost } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Check, X } from 'lucide-react'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

function parseBRL(val: string): number {
  // Accept both "120.50" and "120,50"
  return parseFloat(val.replace(',', '.'))
}

export function FixedCostsPage() {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [costs, setCosts] = useState<FixedCost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Which cost row is in name/avg edit mode
  const [editingCostId, setEditingCostId] = useState<string | null>(null)
  // Which month cell is being edited
  const [editingCell, setEditingCell] = useState<{ costId: string; month: number } | null>(null)
  // Two-step delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // New cost row visibility
  const [showNewRow, setShowNewRow] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getFixedCosts(year)
      .then(setCosts)
      .catch(() => setError('Failed to load fixed costs'))
      .finally(() => setLoading(false))
  }, [year])

  const monthTotals = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        costs.reduce((sum, cost) => {
          const override = cost.overrides.find((o) => o.month === i + 1)
          return sum + (override ? override.amount : cost.amount)
        }, 0),
      ),
    [costs],
  )

  const avgTotal = useMemo(() => costs.reduce((sum, c) => sum + c.amount, 0), [costs])

  function updateCostInState(updated: FixedCost) {
    setCosts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  async function handleDeleteCost(costId: string) {
    try {
      await deleteFixedCost(costId)
      setCosts((prev) => prev.filter((c) => c.id !== costId))
      setConfirmDeleteId(null)
    } catch {
      setError('Failed to delete cost')
    }
  }

  async function handleUpsertOverride(costId: string, month: number, rawValue: string) {
    const value = parseBRL(rawValue)
    if (isNaN(value)) {
      setEditingCell(null)
      return
    }

    const cost = costs.find((c) => c.id === costId)!
    const prevOverrides = cost.overrides

    // Optimistic update
    const newOverrides =
      value === cost.amount
        ? prevOverrides.filter((o) => o.month !== month)
        : [
            ...prevOverrides.filter((o) => o.month !== month),
            { month, amount: value },
          ]
    setCosts((prev) =>
      prev.map((c) => (c.id === costId ? { ...c, overrides: newOverrides } : c)),
    )
    setEditingCell(null)

    try {
      if (value === cost.amount) {
        await deleteFixedCostOverride(costId, month)
      } else {
        await upsertFixedCostOverride(costId, month, value)
      }
    } catch {
      // Rollback
      setCosts((prev) =>
        prev.map((c) => (c.id === costId ? { ...c, overrides: prevOverrides } : c)),
      )
      setError('Failed to save override')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Fixed Costs</h1>
        <div className="flex items-center gap-3">
          {/* Year picker */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setYear((y) => y - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="w-12 text-center text-sm font-medium">{year}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= currentYear}
            >
              <ChevronRight size={16} />
            </Button>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setShowNewRow(true)
              setEditingCostId(null)
              setEditingCell(null)
            }}
          >
            <Plus size={14} />
            Add cost
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[160px] px-4">Name</TableHead>
              <TableHead className="w-24 px-3 text-right">Avg/mo</TableHead>
              {MONTHS.map((m) => (
                <TableHead key={m} className="w-16 px-2 text-right text-xs">{m}</TableHead>
              ))}
              <TableHead className="w-16 px-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.length === 0 && !showNewRow && (
              <TableRow>
                <TableCell colSpan={15} className="py-10 text-center text-sm text-muted-foreground">
                  No fixed costs for {year}.{' '}
                  <button
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={() => setShowNewRow(true)}
                  >
                    Add your first one
                  </button>
                </TableCell>
              </TableRow>
            )}

            {costs.map((cost) => (
              <CostRow
                key={cost.id}
                cost={cost}
                isEditing={editingCostId === cost.id}
                editingCell={editingCell}
                confirmingDelete={confirmDeleteId === cost.id}
                onStartEdit={() => {
                  setEditingCostId(cost.id)
                  setEditingCell(null)
                }}
                onCancelEdit={() => setEditingCostId(null)}
                onSaveEdit={async (name, amount) => {
                  try {
                    const updated = await updateFixedCost(cost.id, { name, amount })
                    updateCostInState(updated)
                    setEditingCostId(null)
                  } catch {
                    setError('Failed to update cost')
                  }
                }}
                onEditCell={(costId, month) => {
                  setEditingCell({ costId, month })
                  setEditingCostId(null)
                }}
                onCommitCell={handleUpsertOverride}
                onCancelCell={() => setEditingCell(null)}
                onConfirmDelete={() => setConfirmDeleteId(cost.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onDelete={() => handleDeleteCost(cost.id)}
              />
            ))}

            {showNewRow && (
              <NewCostRow
                year={year}
                onSave={async (name, amount) => {
                  try {
                    const created = await createFixedCost({ name, year, amount })
                    setCosts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
                    setShowNewRow(false)
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to create cost')
                  }
                }}
                onCancel={() => setShowNewRow(false)}
              />
            )}

            {/* Totals row */}
            {costs.length > 0 && (
              <TableRow className="bg-muted/40 font-medium border-t-2">
                <TableCell className="px-4 text-sm">Total</TableCell>
                <TableCell className="px-3 text-right text-sm">{formatCurrency(avgTotal)}</TableCell>
                {monthTotals.map((total, i) => (
                  <TableCell key={i} className="px-2 text-right text-xs">
                    {formatCurrency(total)}
                  </TableCell>
                ))}
                <TableCell className="px-2" />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── CostRow ──────────────────────────────────────────────────────────────────

interface CostRowProps {
  cost: FixedCost
  isEditing: boolean
  editingCell: { costId: string; month: number } | null
  confirmingDelete: boolean
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveEdit: (name: string, amount: number) => void
  onEditCell: (costId: string, month: number) => void
  onCommitCell: (costId: string, month: number, value: string) => void
  onCancelCell: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onDelete: () => void
}

function CostRow({
  cost,
  isEditing,
  editingCell,
  confirmingDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditCell,
  onCommitCell,
  onCancelCell,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: CostRowProps) {
  const [name, setName] = useState(cost.name)
  const [amount, setAmount] = useState(String(cost.amount))

  // Reset edit fields when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setName(cost.name)
      setAmount(String(cost.amount))
    }
  }, [isEditing, cost.name, cost.amount])

  function handleSaveEdit() {
    const parsed = parseBRL(amount)
    if (!name.trim() || isNaN(parsed)) return
    onSaveEdit(name.trim(), parsed)
  }

  return (
    <TableRow className={isEditing ? 'bg-muted/30' : ''}>
      {/* Name */}
      <TableCell className="px-4">
        {isEditing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-7 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
            autoFocus
          />
        ) : (
          <span className="text-sm font-medium text-foreground">{cost.name}</span>
        )}
      </TableCell>

      {/* Avg/mo */}
      <TableCell className="px-3 text-right">
        {isEditing ? (
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-7 text-sm text-right w-20"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit()
              if (e.key === 'Escape') onCancelEdit()
            }}
          />
        ) : (
          <span className="text-sm text-muted-foreground">{formatCurrency(cost.amount)}</span>
        )}
      </TableCell>

      {/* Month cells */}
      {Array.from({ length: 12 }, (_, i) => {
        const month = i + 1
        const override = cost.overrides.find((o) => o.month === month)
        const effectiveAmount = override ? override.amount : cost.amount
        const isOverridden = !!override
        const isCellEditing = editingCell?.costId === cost.id && editingCell?.month === month

        return (
          <TableCell key={month} className="px-2 text-right">
            {isCellEditing ? (
              <MonthCellInput
                initialValue={String(effectiveAmount)}
                onCommit={(val) => onCommitCell(cost.id, month, val)}
                onCancel={onCancelCell}
              />
            ) : (
              <button
                onClick={() => onEditCell(cost.id, month)}
                className={`text-xs w-full text-right hover:text-foreground transition-colors ${
                  isOverridden ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                {formatCurrency(effectiveAmount)}
              </button>
            )}
          </TableCell>
        )
      })}

      {/* Actions */}
      <TableCell className="px-2">
        <div className="flex items-center justify-end gap-1">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleSaveEdit}
                disabled={!name.trim() || isNaN(parseBRL(amount))}
              >
                <Check size={14} className="text-primary" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={onCancelEdit}>
                <X size={14} />
              </Button>
            </>
          ) : confirmingDelete ? (
            <>
              <Button variant="ghost" size="icon-xs" onClick={onDelete}>
                <Check size={14} className="text-destructive" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={onCancelDelete}>
                <X size={14} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="icon-xs" onClick={onStartEdit}>
                <Pencil size={13} className="text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon-xs" onClick={onConfirmDelete}>
                <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── MonthCellInput ───────────────────────────────────────────────────────────

function MonthCellInput({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: string
  onCommit: (val: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ref.current?.select()
  }, [])

  return (
    <Input
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="h-6 text-xs text-right px-1 w-16"
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(value)
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => onCommit(value)}
    />
  )
}

// ─── NewCostRow ───────────────────────────────────────────────────────────────

function NewCostRow({
  year,
  onSave,
  onCancel,
}: {
  year: number
  onSave: (name: string, amount: number) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')

  function handleSubmit() {
    const parsed = parseBRL(amount)
    if (!name.trim() || isNaN(parsed) || parsed < 0) return
    onSave(name.trim(), parsed)
  }

  return (
    <TableRow className="bg-muted/20">
      <TableCell className="px-4">
        <Input
          placeholder="Cost name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onCancel()
          }}
          autoFocus
        />
      </TableCell>
      <TableCell className="px-3">
        <Input
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-7 text-sm text-right w-20"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
            if (e.key === 'Escape') onCancel()
          }}
        />
      </TableCell>
      <TableCell colSpan={12} className="px-2 text-xs text-muted-foreground">
        Default amount applied to all months of {year}
      </TableCell>
      <TableCell className="px-2">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleSubmit}
            disabled={!name.trim() || isNaN(parseBRL(amount))}
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
