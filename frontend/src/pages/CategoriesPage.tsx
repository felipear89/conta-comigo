import { useEffect, useState } from 'react'
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getRules,
  createRule,
  deleteRule,
} from '@/services/api'
import type { Category, CategoryRule } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-3 w-3 rounded-full border border-black/10 flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  function loadCategories() {
    return getCategories().then(setCategories)
  }

  useEffect(() => {
    setLoading(true)
    loadCategories().finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Manage categories and keyword rules
        </p>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-6">
          <CategoriesTab categories={categories} onChanged={loadCategories} />
        </TabsContent>

        <TabsContent value="rules" className="mt-6">
          <RulesTab categories={categories} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Tab: Categories ───────────────────────────────────────────────────────────

function CategoriesTab({
  categories,
  onChanged,
}: {
  categories: Category[]
  onChanged: () => Promise<void>
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(data: { name: string; color: string; icon: string }) {
    setError(null)
    try {
      await createCategory(data)
      await onChanged()
      setShowForm(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create')
    }
  }

  async function handleUpdate(
    id: string,
    data: Partial<{ name: string; color: string; icon: string }>,
  ) {
    setError(null)
    try {
      await updateCategory(id, data)
      await onChanged()
      setEditingId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    }
  }

  async function handleDelete(id: string) {
    setError(null)
    try {
      await deleteCategory(id)
      await onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">{error}</p>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="px-4 w-12">Icon</TableHead>
              <TableHead className="px-4 w-24">Color</TableHead>
              <TableHead className="px-4">Name</TableHead>
              <TableHead className="px-4 w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) =>
              editingId === cat.id ? (
                <EditCategoryRow
                  key={cat.id}
                  category={cat}
                  onSave={(data) => handleUpdate(cat.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <TableRow key={cat.id}>
                  <TableCell className="px-4 text-xl">{cat.icon}</TableCell>
                  <TableCell className="px-4">
                    <div className="flex items-center gap-2">
                      <ColorDot color={cat.color} />
                      <span className="text-xs font-mono text-muted-foreground">{cat.color}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 font-medium text-foreground">{cat.name}</TableCell>
                  <TableCell className="px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditingId(cat.id)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(cat.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ),
            )}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No categories yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showForm ? (
        <NewCategoryForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          <Plus />
          Add category
        </Button>
      )}
    </div>
  )
}

function EditCategoryRow({
  category,
  onSave,
  onCancel,
}: {
  category: Category
  onSave: (data: Partial<{ name: string; color: string; icon: string }>) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const [icon, setIcon] = useState(category.icon)

  return (
    <TableRow className="bg-muted/30">
      <TableCell className="px-4">
        <Input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="w-16 text-center text-xl"
          maxLength={2}
        />
      </TableCell>
      <TableCell className="px-4">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5"
          />
          <span className="text-xs font-mono text-muted-foreground">{color}</span>
        </div>
      </TableCell>
      <TableCell className="px-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-48"
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave({ name, color, icon })
            if (e.key === 'Escape') onCancel()
          }}
          autoFocus
        />
      </TableCell>
      <TableCell className="px-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onSave({ name, color, icon })}
            disabled={!name.trim()}
          >
            <Check />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onCancel}>
            <X />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function NewCategoryForm({
  onSave,
  onCancel,
}: {
  onSave: (data: { name: string; color: string; icon: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6b7280')
  const [icon, setIcon] = useState('💳')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name: name.trim(), color, icon })
    setSaving(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-dashed border-border bg-muted/30 p-4 space-y-4"
    >
      <p className="text-sm font-medium text-foreground">New category</p>
      <div className="flex items-end gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="w-16 text-center text-xl"
            maxLength={2}
          />
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded border border-input bg-transparent p-0.5 block"
          />
        </div>
        <div className="space-y-2 flex-1">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Groceries"
            autoFocus
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={!name.trim() || saving}>
            {saving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Check />
            )}
            Save
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}

// ── Tab: Rules ────────────────────────────────────────────────────────────────

function RulesTab({ categories }: { categories: Category[] }) {
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function load() {
    return getRules().then(setRules)
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim() || !categoryId) return
    setAdding(true)
    setError(null)
    try {
      const rule = await createRule({ keyword: keyword.trim(), category_id: categoryId })
      setRules((prev) => [...prev, rule].sort((a, b) => a.keyword.localeCompare(b.keyword)))
      setKeyword('')
      setCategoryId('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add rule')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteRule(id)
      setRules((prev) => prev.filter((r) => r.id !== id))
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
        <p className="text-sm font-medium text-foreground mb-4">Add keyword rule</p>
        <form onSubmit={handleAdd} className="flex items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label>Keyword</Label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. netflix"
            />
          </div>
          <div className="space-y-2 w-48">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!keyword.trim() || !categoryId || adding}
          >
            {adding ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <Plus />
            )}
            Add rule
          </Button>
        </form>
        {error && (
          <p className="text-sm text-destructive mt-3">{error}</p>
        )}
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Keyword</TableHead>
                <TableHead className="px-4">Category</TableHead>
                <TableHead className="px-4 w-16 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="px-4">
                    <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono">
                      {rule.keyword}
                    </code>
                  </TableCell>
                  <TableCell className="px-4">
                    {rule.category ? (
                      <div className="flex items-center gap-2">
                        <ColorDot color={rule.category.color} />
                        <span className="text-sm">{rule.category.icon}</span>
                        <span className="text-sm font-medium text-foreground">
                          {rule.category.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(rule.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No rules yet. Rules match keywords in transaction descriptions.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

