import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowDownToLine, ArrowUpFromLine, BarChart3, ChevronDown, ChevronLeft, ChevronRight, DollarSign, FileText, KeyRound, LayoutDashboard, LogOut, Menu, Package, Quote, Receipt, Truck, Users, X,
} from 'lucide-react'
import { Button, cx, Field, Input, Modal, Toaster } from './ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useStore } from '@/lib/store'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, color: 'from-orange-400 to-orange-500' },
  {
    label: 'Stock',
    icon: Package,
    color: 'from-orange-400 to-orange-500',
    children: [
      { to: '/items', label: 'Items', icon: Package },
      { to: '/stock-in', label: 'Stock In', icon: ArrowDownToLine },
      { to: '/stock-out', label: 'Stock Out', icon: ArrowUpFromLine },
    ],
  },
  {
    label: 'Buying',
    icon: Truck,
    color: 'from-orange-400 to-orange-500',
    children: [
      { to: '/suppliers', label: 'Suppliers', icon: Truck },
      { to: '/quotations', label: 'Quotations', icon: Quote },
      { to: '/purchase-bills', label: 'Purchase Bills', icon: Receipt },
    ],
  },
  {
    label: 'Selling',
    icon: Users,
    color: 'from-orange-400 to-orange-500',
    children: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/sales-invoices', label: 'Sales Invoices', icon: FileText },
    ],
  },
  {
    label: 'Accounts',
    icon: DollarSign,
    color: 'from-orange-400 to-orange-500',
    children: [
      { to: '/payment-in', label: 'Payment In', icon: ArrowDownToLine },
      { to: '/payment-out', label: 'Payment Out', icon: ArrowUpFromLine },
    ],
  },
  { to: '/reports', label: 'Reports', icon: BarChart3, color: 'from-orange-400 to-orange-500' },
]

function UserBox({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  const { user, logout } = useAuth()
  const [pwOpen, setPwOpen] = useState(false)
  return (
    <div className="border-t border-white/10 p-3">
      {!collapsed && (
        <>
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
        </>
      )}
      <button
        onClick={onToggleCollapse}
        className={cx('mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-2 text-xs hover:bg-white/10 hover:text-white', collapsed ? 'mt-0' : '')}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        {!collapsed && (collapsed ? 'Expand' : 'Collapse')}
      </button>
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
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['Stock', 'Buying', 'Selling', 'Accounts']))
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const renderNavItem = (item: any, depth = 0) => {
    if (item.children) {
      const isExpanded = expandedMenus.has(item.label)
      const hasActiveChild = item.children.some((child: any) => pathname.startsWith(child.to))
      const colorClass = item.color || 'from-orange-400 to-orange-500'

      return (
        <div key={item.label} className="mb-1">
          <button
            onClick={() => !collapsed && toggleMenu(item.label)}
            className={cx(
              'group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[14px] font-semibold transition-all duration-200',
              hasActiveChild
                ? `bg-gradient-to-r ${colorClass} text-white shadow-lg shadow-orange-500/30`
                : 'hover:bg-orange-500/20 hover:text-white text-slate-300',
              collapsed ? 'justify-center px-2' : '',
            )}
            title={collapsed ? item.label : undefined}
          >
            <div className="flex items-center gap-3">
              <div className={cx(
                'rounded-lg p-1.5 transition-transform group-hover:scale-110',
                hasActiveChild ? 'bg-white/20' : 'bg-orange-500/10 group-hover:bg-orange-500/20'
              )}>
                <item.icon size={18} />
              </div>
              {!collapsed && item.label}
            </div>
            {!collapsed && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </button>
          {!collapsed && isExpanded && (
            <div className="ml-3 mt-1.5 space-y-1 border-l-2 border-orange-500/30 pl-3">
              {item.children.map((child: any) => renderNavItem(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    const colorClass = item.color || 'from-orange-400 to-orange-500'

    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={onNavigate}
        className={({ isActive }) =>
          cx(
            'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-all duration-200',
            isActive
              ? depth > 0
                ? 'bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-200 shadow-sm shadow-amber-300/20'
                : `bg-gradient-to-r ${colorClass} text-white shadow-lg shadow-orange-500/30`
              : depth > 0
                ? 'hover:bg-amber-100/15 hover:text-amber-100 text-slate-300'
                : 'hover:bg-orange-500/20 hover:text-white text-slate-300',
            collapsed ? 'justify-center px-2' : '',
          )
        }
        title={collapsed ? item.label : undefined}
      >
        {depth > 0 && !collapsed && <div className="w-2" />}
        <div className={cx(
          'rounded-lg p-1.5 transition-transform group-hover:scale-110',
          depth === 0
            ? 'bg-orange-500/10 group-hover:bg-orange-500/20'
            : depth > 0 && pathname.startsWith(item.to)
              ? 'bg-amber-200 text-amber-950'
              : 'bg-amber-500/10 group-hover:bg-amber-200/70'
        )}>
          <item.icon size={18} />
        </div>
        {!collapsed && item.label}
      </NavLink>
    )
  }

  return (
    <aside className={cx('flex h-full flex-col bg-gradient-to-b from-[#0f172a] via-[#1e293b] to-[#0f172a] text-slate-300 print:hidden shadow-2xl transition-all duration-300', collapsed ? 'w-16' : 'w-64')}>
      <div className={cx('flex h-16 items-center border-b border-orange-500/30 bg-[#0f172a]', collapsed ? 'justify-center px-2' : 'gap-3 px-5')}>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#fb9223] text-white backdrop-blur-sm">
          <Package size={20} />
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-base font-bold text-white">Krishna Steel Center</div>
            <div className="text-xs text-white/80">Stock Management</div>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {NAV.map(item => renderNavItem(item))}
      </nav>
      <UserBox collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
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
