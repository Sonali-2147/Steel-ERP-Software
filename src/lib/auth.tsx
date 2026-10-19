import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, authToken, type User } from './api'

interface Auth {
  user: User | null
  checking: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const Ctx = createContext<Auth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(() => !!authToken.get())

  useEffect(() => {
    if (authToken.get()) {
      api.me().then(setUser).catch(() => setUser(null)).finally(() => setChecking(false))
    }
    const onLogout = () => setUser(null)
    window.addEventListener('erp:logout', onLogout)
    return () => window.removeEventListener('erp:logout', onLogout)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.login(username, password)
    authToken.set(res.token)
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    try { await api.logout() } catch { /* already logged out */ }
    authToken.clear()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, checking, login, logout }), [user, checking, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const a = useContext(Ctx)
  if (!a) throw new Error('useAuth must be used within AuthProvider')
  return a
}
