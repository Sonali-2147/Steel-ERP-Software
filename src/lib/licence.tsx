import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from './api'
import type { LicenceStatus } from './types'

interface Licence {
  status: LicenceStatus | null
  refresh: () => Promise<void>
  activate: (key: string) => Promise<void>
}

const Ctx = createContext<Licence | null>(null)

export function LicenceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<LicenceStatus | null>(null)

  const refresh = useCallback(async () => {
    setStatus(await api.licenceStatus())
  }, [])

  const activate = useCallback(async (key: string) => {
    setStatus(await api.activateLicence(key))
  }, [])

  useEffect(() => {
    refresh().catch(() => setStatus(null))
    // Any API call refused for licence reasons sends the user back to the activation screen.
    const onRefused = () => { refresh().catch(() => setStatus(null)) }
    window.addEventListener('erp:licence', onRefused)
    return () => window.removeEventListener('erp:licence', onRefused)
  }, [refresh])

  const value = useMemo(() => ({ status, refresh, activate }), [status, refresh, activate])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLicence() {
  const l = useContext(Ctx)
  if (!l) throw new Error('useLicence must be used within LicenceProvider')
  return l
}
