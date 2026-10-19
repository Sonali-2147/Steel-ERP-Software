import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowDownToLine, ArrowUpFromLine, BarChart3, Boxes, FileText, KeyRound, LayoutDashboard, LogOut, Menu, Package, Receipt, Truck, Users, X,
} from 'lucide-react'
import { Button, cx, Field, Input, Modal, Toaster } from './ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/items', label: 'Items', icon: Package },
  { to: '/stock-in', label: 'Stock In', icon: ArrowDownToLine },
  { to: '/stock-out', label: 'Stock Out', icon: ArrowUpFromLine },
  { to: '/purchase-bills', label: 'Purchase Bills', icon: Receipt },
  { to: '/sales-invoices', label: 'Sales Invoices', icon: FileText },
  { to: '/suppliers', label: 'Suppliers', icon: Truck },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
]

function UserBox() {
  const { user, logout } = useAuth()
  const [pwOpen, setPwOpen] = useState(false)
  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-steel-600 text-sm font-semibold uppercase text-white">{user?.username.slice(0, 1)}</div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-medium text-white">{user?.name || user?.username}</div>
          <div className="truncate text-xs text-slate-400">@{user?.username}</div>
        </div>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <button onClick={() => setPwOpen(true)} className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-xs hover:bg-white/10 hover:text-white">
          <KeyRound size={14} /> Password
        </button>
        <button onClick={logout} className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-xs hover:bg-red-500/80 hover:text-white">
          <LogOut size={14} /> Logout
        </button>
      </div>
      {pwOpen && <ChangePassword onClose={() => setPwOpen(false)} />}
    </div>
  )
}

function ChangePassword({ onClose }: { onClose: () => void }) {
  const { notify } = useStore()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (next !== confirm) return notify('New passwords do not match', 'error')
    setBusy(true)
    try {
      await api.changePassword(cur, next)
      notify('Password changed')
      onClose()
    } catch (err) {
      notify((err as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open onClose={onClose} title="Change Password" footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" form="pw-form" disabled={busy}>{busy ? 'Saving…' : 'Change Password'}</Button>
      </>
    }>
      <form id="pw-form" onSubmit={save} className="space-y-4 text-slate-700">
        <Field label="Current password"><Input type="password" required value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></Field>
        <Field label="New password" hint="At least 6 characters"><Input type="password" required value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Confirm new password"><Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
      </form>
    </Modal>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full w-60 flex-col bg-navy-900 text-slate-300 print:hidden">
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent-500 text-white">
          <Boxes size={20} />
        </div>
        <div className="leading-tight">
          <div className="text-base font-bold text-white">Krishna Steel Center</div>
          <div className="text-xs text-slate-400">Stock Management</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-all duration-150',
                isActive ? 'bg-accent-500 text-white shadow-md shadow-accent-500/30' : 'hover:translate-x-1 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Icon size={19} className="transition-transform group-hover:scale-110" />
            {label}
          </NavLink>
        ))}
      </nav>
      <UserBox />
    </aside>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const { connected } = useStore()

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="flex h-full">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
          <button onClick={() => setMobileOpen(false)} className="absolute right-4 top-4 text-white" aria-label="Close menu">
            <X />
          </button>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden print:hidden">
          <button onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-slate-800">Krishna Steel Center</span>
        </header>

        {!connected && (
          <div className="bg-red-600 px-4 py-2 text-center text-sm text-white print:hidden">
            Cannot connect to the server. Please make sure the backend is running.
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0">
          <div className="mx-auto max-w-[1300px]">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
