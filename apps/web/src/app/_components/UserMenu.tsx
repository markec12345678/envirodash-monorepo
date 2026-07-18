'use client'

import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { LogIn, LogOut, User, Loader2, X } from 'lucide-react'

interface UserMenuProps {
  showClose?: boolean
}

function UserMenu({ showClose }: UserMenuProps) {
  const { data: session, status } = useSession()
  const [showLogin, setShowLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    )
  }

  if (session) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg bg-emerald-100 px-2 py-1 text-xs dark:bg-emerald-950/50">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
            <User className="h-3 w-3" />
          </div>
          <div className="hidden sm:block">
            <div className="font-medium text-emerald-700 dark:text-emerald-300">
              {session.user?.name || session.user?.email}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
              {(session.user as any)?.plan || 'free'} · {(session.user as any)?.role || 'user'}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowLogin(true)}
        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        <LogIn className="h-4 w-4" />
        Sign In
      </button>

      {showLogin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowLogin(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Sign in to EnviroDash</h2>
              {showClose && (
                <button onClick={() => setShowLogin(false)} className="rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
              <strong>Demo credentials:</strong>
              <br />
              Email: <code>demo@envirodash.si</code>
              <br />
              Password: <code>envirodash</code>
              <br />
              <span className="mt-1 block text-emerald-600 dark:text-emerald-400">
                (Any email + password "demo" also works)
              </span>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setLoading(true)
                setError(null)
                const res = await signIn('credentials', {
                  email,
                  password,
                  redirect: false,
                })
                setLoading(false)
                if (res?.error) {
                  setError('Invalid credentials')
                } else {
                  setShowLogin(false)
                  setEmail('')
                  setPassword('')
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="demo@envirodash.si"
                  required
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="envirodash"
                  required
                  className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export function UserMenuWrapper(props: UserMenuProps) {
  return (
    <SessionProvider>
      <UserMenu {...props} />
    </SessionProvider>
  )
}

export default UserMenuWrapper
