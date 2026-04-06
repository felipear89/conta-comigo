import { supabase } from '@/lib/supabase'
import type {
  Category,
  CategoryRule,
  FixedCost,
  FixedCostOverride,
  ForecastMonth,
  ImportPreviewTransaction,
  Transaction,
} from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return { Authorization: `Bearer ${session?.access_token ?? ''}` }
}

async function jsonHeaders() {
  const headers = await authHeaders()
  return { ...headers, 'Content-Type': 'application/json' }
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getTransactions(params?: {
  category_id?: string
  date_from?: string
  date_to?: string
  bill_month?: string
}): Promise<Transaction[]> {
  const headers = await authHeaders()
  const q = new URLSearchParams()
  if (params?.category_id) q.set('category_id', params.category_id)
  if (params?.date_from) q.set('date_from', params.date_from)
  if (params?.date_to) q.set('date_to', params.date_to)
  if (params?.bill_month) q.set('bill_month', params.bill_month)
  const res = await fetch(`${BASE_URL}/transactions${q.size ? `?${q}` : ''}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

export async function deleteTransactions(ids: string[]): Promise<{ deleted: number }> {
  const headers = await jsonHeaders()
  const res = await fetch(`${BASE_URL}/transactions`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify({ ids }),
  })
  if (!res.ok) throw new Error('Failed to delete transactions')
  return res.json()
}

export async function updateTransactionCategory(transactionId: string, categoryId: string) {
  const headers = await jsonHeaders()
  const res = await fetch(`${BASE_URL}/transactions/${transactionId}/category`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ category_id: categoryId }),
  })
  if (!res.ok) throw new Error('Failed to update category')
  return res.json()
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/categories`, { headers })
  if (!res.ok) throw new Error('Failed to fetch categories')
  return res.json()
}

export async function createCategory(data: {
  name: string
  color: string
  icon: string
}): Promise<Category> {
  const headers = await jsonHeaders()
  const res = await fetch(`${BASE_URL}/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateCategory(
  id: string,
  data: Partial<{ name: string; color: string; icon: string }>,
): Promise<Category> {
  const headers = await jsonHeaders()
  const res = await fetch(`${BASE_URL}/categories/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteCategory(id: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/categories/${id}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Failed to delete category')
  }
}

// ── Category Rules ────────────────────────────────────────────────────────────

export async function getRules(): Promise<CategoryRule[]> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/categories/rules`, { headers })
  if (!res.ok) throw new Error('Failed to fetch rules')
  return res.json()
}

export async function createRule(data: {
  keyword: string
  category_id: string
}): Promise<CategoryRule> {
  const headers = await jsonHeaders()
  const res = await fetch(`${BASE_URL}/categories/rules`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Failed to create rule')
  }
  return res.json()
}

export async function deleteRule(id: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/categories/rules/${id}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error('Failed to delete rule')
}


// ── Fixed Costs ───────────────────────────────────────────────────────────────

export async function getFixedCosts(year: number): Promise<FixedCost[]> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/fixed-costs?year=${year}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch fixed costs')
  return res.json()
}

export async function createFixedCost(data: { name: string; year: number; amount: number }): Promise<FixedCost> {
  const headers = await jsonHeaders()
  const res = await fetch(`${BASE_URL}/fixed-costs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Failed to create fixed cost')
  }
  return res.json()
}

export async function updateFixedCost(id: string, data: Partial<{ name: string; amount: number }>): Promise<FixedCost> {
  const headers = await jsonHeaders()
  const res = await fetch(`${BASE_URL}/fixed-costs/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Failed to update fixed cost')
  }
  return res.json()
}

export async function deleteFixedCost(id: string): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/fixed-costs/${id}`, { method: 'DELETE', headers })
  if (!res.ok) throw new Error('Failed to delete fixed cost')
}

export async function upsertFixedCostOverride(costId: string, month: number, amount: number): Promise<FixedCostOverride> {
  const headers = await jsonHeaders()
  const res = await fetch(`${BASE_URL}/fixed-costs/${costId}/overrides/${month}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ amount }),
  })
  if (!res.ok) throw new Error('Failed to save override')
  return res.json()
}

export async function deleteFixedCostOverride(costId: string, month: number): Promise<void> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/fixed-costs/${costId}/overrides/${month}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error('Failed to delete override')
}

// ── Forecast ─────────────────────────────────────────────────────────────────

export async function getForecast(): Promise<ForecastMonth[]> {
  const headers = await authHeaders()
  const res = await fetch(`${BASE_URL}/forecast`, { headers })
  if (!res.ok) throw new Error('Failed to fetch forecast')
  return res.json()
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function previewCsv(file: File): Promise<ImportPreviewTransaction[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/import/preview`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to preview CSV')
  return res.json()
}

export async function confirmImport(
  transactions: ImportPreviewTransaction[],
  billMonth: string,  // "YYYY-MM"
) {
  const headers = await jsonHeaders()
  const res = await fetch(`${BASE_URL}/import/confirm`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ transactions, bill_month: `${billMonth}-01` }),
  })
  if (!res.ok) throw new Error('Failed to import transactions')
  return res.json() as Promise<{ inserted: number }>
}
