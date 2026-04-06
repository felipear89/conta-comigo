import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-16">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">C</span>
          </div>
          <span className="font-semibold text-white">Conta Comigo</span>
        </div>

        <div className="space-y-8">
          <blockquote className="text-3xl font-semibold text-white leading-snug">
            "Know exactly where<br />every real goes."
          </blockquote>
          <ul className="space-y-4">
            {[
              'Import credit card statements via CSV',
              'Auto-categorize with AI and custom rules',
              'Visualize monthly spending at a glance',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-white/60 text-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/20">Personal expense manager</p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">C</span>
            </div>
            <span className="font-semibold text-foreground">Conta Comigo</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage your expenses</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-4 py-3 rounded-lg">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
