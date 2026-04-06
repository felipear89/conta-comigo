import { useEffect, useRef, useState } from 'react'
import { previewCsv, confirmImport, getCategories } from '@/services/api'
import type { ImportPreviewTransaction, Category } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, Tag } from 'lucide-react'

type ImportStep = 'upload' | 'review' | 'confirm'

interface ImportPageProps {
  onImported: () => void
  onGoToCategories?: () => void
}

export function ImportPage({ onImported, onGoToCategories }: ImportPageProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [preview, setPreview] = useState<ImportPreviewTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [billMonth, setBillMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  const steps: ImportStep[] = ['upload', 'review', 'confirm']
  const stepLabels: Record<ImportStep, string> = {
    upload: 'Upload',
    review: 'Review',
    confirm: 'Confirm',
  }
  const currentIdx = steps.indexOf(step)

  return (
    <div className="p-8 max-w-6xl space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Credit card statement</h1>
        <p className="text-sm text-muted-foreground">
          Upload your bank statement and categorize transactions
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0">
        {steps.map((s, i) => {
          const done = i < currentIdx
          const active = i === currentIdx
          return (
            <div key={s} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    done
                      ? 'bg-primary text-primary-foreground'
                      : active
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {done ? <CheckCircle2 size={14} /> : i + 1}
                </div>
                <span
                  className={`text-sm font-medium ${
                    active ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {stepLabels[s]}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-4 h-px w-12 ${done ? 'bg-primary' : 'bg-border'}`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      {step === 'upload' && (
        <UploadStep
          billMonth={billMonth}
          onBillMonthChange={setBillMonth}
          onNext={(data) => {
            setPreview(data)
            setStep('review')
          }}
        />
      )}
      {step === 'review' && (
        <ReviewStep
          transactions={preview}
          categories={categories}
          onNext={(edited) => {
            setPreview(edited)
            setStep('confirm')
          }}
          onBack={() => setStep('upload')}
          onGoToCategories={onGoToCategories}
        />
      )}
      {step === 'confirm' && (
        <ConfirmStep
          transactions={preview}
          categories={categories}
          billMonth={billMonth}
          onBack={() => setStep('review')}
          onImported={onImported}
        />
      )}
    </div>
  )
}

// ─── Step 1: Upload ────────────────────────────────────────────────────────────

function UploadStep({
  billMonth,
  onBillMonthChange,
  onNext,
}: {
  billMonth: string
  onBillMonthChange: (value: string) => void
  onNext: (preview: ImportPreviewTransaction[]) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [billYear, billMonthNum] = billMonth.split('-').map(Number)
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]
  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' },
    { value: 3, label: 'March' }, { value: 4, label: 'April' },
    { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' },
    { value: 9, label: 'September' }, { value: 10, label: 'October' },
    { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ]

  function updateBillMonth(year: number, month: number) {
    onBillMonthChange(`${year}-${String(month).padStart(2, '0')}`)
  }

  function handleFile(f: File) {
    if (!f.name.endsWith('.csv')) {
      setError('Please upload a .csv file')
      return
    }
    setFile(f)
    setError(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const data = await previewCsv(file)
      onNext(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse CSV')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Bill month picker */}
      <div className="flex items-center gap-3 rounded-xl border bg-card px-5 py-4">
        <span className="text-sm font-medium text-foreground">Bill month</span>
        <Select
          value={String(billMonthNum)}
          onValueChange={(v) => updateBillMonth(billYear, Number(v))}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(billYear)}
          onValueChange={(v) => updateBillMonth(Number(v), billMonthNum)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground ml-2">
          All transactions in this CSV will be assigned to this billing month.
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 cursor-pointer transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : file
              ? 'border-primary/40 bg-primary/5'
              : 'border-border bg-card hover:border-primary/40 hover:bg-muted/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="sr-only"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />

        {file ? (
          <>
            <div className="p-3 rounded-xl bg-primary/10">
              <FileText size={24} className="text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB · Click to change
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="p-3 rounded-xl bg-muted">
              <Upload size={24} className="text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground">Drop your CSV here</p>
              <p className="text-sm text-muted-foreground">or click to browse files</p>
            </div>
            <span className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
              .csv files only
            </span>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleAnalyze} disabled={!file || loading} size="sm">
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Analyzing…
            </>
          ) : (
            <>
              Analyze CSV
              <ArrowRight />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ─── Step 2: Review ───────────────────────────────────────────────────────────

const SOURCE_BADGE: Record<string, { label: string; variant: 'secondary' | 'outline' }> = {
  rule: { label: 'Rule', variant: 'outline' },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
}

function ReviewStep({
  transactions: initial,
  categories,
  onNext,
  onBack,
  onGoToCategories,
}: {
  transactions: ImportPreviewTransaction[]
  categories: Category[]
  onNext: (edited: ImportPreviewTransaction[]) => void
  onBack: () => void
  onGoToCategories?: () => void
}) {
  const [rows, setRows] = useState<ImportPreviewTransaction[]>(initial)

  function setCategory(idx: number, categoryId: string) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === idx ? { ...r, suggested_category_id: categoryId || null, category_source: null } : r,
      ),
    )
  }

  const categorized = rows.filter((r) => r.suggested_category_id).length
  const unrecognized = rows.filter((r) => !r.suggested_category_id)
  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  // Unique unrecognized descriptions/bank_categories to help user create rules
  const unrecognizedHints = Array.from(
    new Set(
      unrecognized.map((r) =>
        r.bank_category ? `${r.description} (${r.bank_category})` : r.description,
      ),
    ),
  ).slice(0, 5)

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-8 rounded-xl border bg-card px-6 py-4">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Transactions</p>
          <p className="text-xl font-semibold text-foreground">{rows.length}</p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</p>
          <p className="text-xl font-semibold text-foreground">{formatCurrency(total)}</p>
        </div>
        <Separator orientation="vertical" className="h-8" />
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categorized</p>
          <p className="text-xl font-semibold text-foreground">
            {categorized}
            <span className="text-sm font-normal text-muted-foreground ml-1">/ {rows.length}</span>
          </p>
        </div>
        <p className="ml-auto text-xs text-muted-foreground">Click a category to change it</p>
      </div>

      {/* Unrecognized warning */}
      {unrecognized.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-amber-900">
                {unrecognized.length} transaction{unrecognized.length > 1 ? 's' : ''} could not be categorized
              </p>
              <p className="text-xs text-amber-700">
                No matching keyword rule was found. Assign a category manually below,
                or{' '}
                {onGoToCategories ? (
                  <button
                    onClick={onGoToCategories}
                    className="underline underline-offset-2 font-medium hover:text-amber-900"
                  >
                    create rules in Categories
                  </button>
                ) : (
                  <span className="font-medium">create rules in Categories</span>
                )}{' '}
                so future imports are recognized automatically.
              </p>
            </div>
          </div>
          {unrecognizedHints.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pl-7">
              {unrecognizedHints.map((hint) => (
                <code
                  key={hint}
                  className="rounded bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs text-amber-800 font-mono"
                >
                  {hint}
                </code>
              ))}
              {unrecognized.length > 5 && (
                <span className="text-xs text-amber-600 py-0.5">
                  +{unrecognized.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="max-h-[640px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4 w-24">Date</TableHead>
                <TableHead className="px-4">Description</TableHead>
                <TableHead className="px-4 w-28 text-right">Amount</TableHead>
                <TableHead className="px-4 w-48">Category</TableHead>
                <TableHead className="px-4 w-20">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const src = row.category_source ? SOURCE_BADGE[row.category_source] : null
                const isUnrecognized = !row.suggested_category_id
                return (
                  <TableRow
                    key={idx}
                    className={isUnrecognized ? 'bg-amber-50/50 hover:bg-amber-50' : ''}
                  >
                    <TableCell className="px-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell className="px-4">
                      <p className={`font-medium ${isUnrecognized ? 'text-amber-900' : 'text-foreground'}`}>
                        {row.description}
                      </p>
                      {row.bank_category && (
                        <p className="text-xs text-muted-foreground mt-0.5">{row.bank_category}</p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 text-right font-medium text-foreground whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </TableCell>
                    <TableCell className="px-4">
                      <Select
                        value={row.suggested_category_id ?? '__none__'}
                        onValueChange={(val) => setCategory(idx, val === '__none__' ? '' : val)}
                      >
                        <SelectTrigger
                          size="sm"
                          className={`w-44 ${isUnrecognized ? 'border-amber-300' : ''}`}
                        >
                          <SelectValue placeholder="— pick a category —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Uncategorized</SelectItem>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.icon} {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-4">
                      {isUnrecognized ? (
                        <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                          Unknown
                        </Badge>
                      ) : src ? (
                        <Badge variant={src.variant}>{src.label}</Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <div className="flex items-center gap-3">
          {unrecognized.length > 0 && onGoToCategories && (
            <Button variant="outline" size="sm" onClick={onGoToCategories}>
              <Tag />
              Add rules first
            </Button>
          )}
          <Button onClick={() => onNext(rows)} size="sm">
            Continue anyway
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3: Confirm ──────────────────────────────────────────────────────────

function ConfirmStep({
  transactions,
  categories,
  billMonth,
  onBack,
  onImported,
}: {
  transactions: ImportPreviewTransaction[]
  categories: Category[]
  billMonth: string
  onBack: () => void
  onImported: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inserted, setInserted] = useState<number | null>(null)

  const total = transactions.reduce((sum, t) => sum + t.amount, 0)
  const categorized = transactions.filter((t) => t.suggested_category_id).length
  const uncategorized = transactions.length - categorized

  const byCat = new Map<string, { category: Category; count: number }>()
  for (const t of transactions) {
    if (!t.suggested_category_id) continue
    const cat = categories.find((c) => c.id === t.suggested_category_id)
    if (!cat) continue
    const entry = byCat.get(t.suggested_category_id)
    if (entry) entry.count++
    else byCat.set(t.suggested_category_id, { category: cat, count: 1 })
  }
  const catBreakdown = Array.from(byCat.values()).sort((a, b) => b.count - a.count)

  async function handleImport() {
    setLoading(true)
    setError(null)
    try {
      const result = await confirmImport(transactions, billMonth)
      setInserted(result.inserted)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  if (inserted !== null) {
    return (
      <div className="rounded-xl border bg-card p-16 flex flex-col items-center gap-6">
        <div className="p-4 rounded-full bg-primary/10">
          <CheckCircle2 size={32} className="text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Import complete</h2>
          <p className="text-sm text-muted-foreground">
            {inserted} {inserted === 1 ? 'transaction' : 'transactions'} added successfully
          </p>
        </div>
        <Button onClick={onImported} size="sm">
          View Transactions
          <ArrowRight />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-6 space-y-6">
        <h2 className="font-semibold text-foreground">Import summary</h2>

        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-muted px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Transactions
            </p>
            <p className="text-2xl font-semibold text-foreground">{transactions.length}</p>
          </div>
          <div className="rounded-lg bg-muted px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total
            </p>
            <p className="text-2xl font-semibold text-foreground">{formatCurrency(total)}</p>
          </div>
          <div className="rounded-lg bg-muted px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Categorized
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {categorized}
              {uncategorized > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({uncategorized} uncategorized)
                </span>
              )}
            </p>
          </div>
        </div>

        {catBreakdown.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              By category
            </p>
            <div className="flex flex-wrap gap-2">
              {catBreakdown.map(({ category, count }) => (
                <span
                  key={category.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
                  style={{
                    backgroundColor: `${category.color}15`,
                    color: category.color,
                    borderColor: `${category.color}30`,
                  }}
                >
                  {category.icon}
                  {category.name}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: `${category.color}25` }}
                  >
                    {count}
                  </span>
                </span>
              ))}
              {uncategorized > 0 && (
                <Badge variant="outline">
                  Uncategorized · {uncategorized}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleImport} disabled={loading} size="sm">
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Importing…
            </>
          ) : (
            <>
              Import {transactions.length} transactions
              <ArrowRight />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
