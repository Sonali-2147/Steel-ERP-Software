import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import type { Item, Party } from './types'

export interface Toast {
  id: number
  message: string
  kind: 'success' | 'error' | 'info'
}

interface Store {
  items: Item[]
  suppliers: Party[]
  customers: Party[]
  loading: boolean
  connected: boolean
  toasts: Toast[]
  refresh: () => Promise<void>
  notify: (message: string, kind?: Toast['kind']) => void
  dismissToast: (id: number) => void
}

const Ctx = createContext<Store | null>(null)
let toastId = 0

export function StoreProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const notify = useCallback((message: string, kind: Toast['kind'] = 'success') => {
    const id = ++toastId
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => dismissToast(id), kind === 'error' ? 6000 : 3500)
  }, [dismissToast])

  const refresh = useCallback(async () => {
    try {
      const [i, p] = await Promise.all([api.getItems(), api.getParties()])
      setItems(i)
      setParties(p)
      setConnected(true)
    } catch {
      setConnected(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const value = useMemo<Store>(() => ({
    items,
    suppliers: parties.filter((p) => p.type === 'supplier'),
    customers: parties.filter((p) => p.type === 'customer'),
    loading,
    connected,
    toasts,
    refresh,
    notify,
    dismissToast,
  }), [items, parties, loading, connected, toasts, refresh, notify, dismissToast])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore must be used within StoreProvider')
  return s
}

export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock'

export const stockStatus = (stock: number, min: number): StockStatus =>
  stock <= 0 ? 'Out of Stock' : stock <= min ? 'Low Stock' : 'In Stock'
