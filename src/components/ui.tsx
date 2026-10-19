import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Info, Search, X, XCircle } from 'lucide-react'
import clsx from 'clsx'
import { useStore } from '@/lib/store'

export const cx = clsx

/* ---------- Button ---------- */
type BtnVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'in' | 'out'
export function Button({
  variant = 'primary', size = 'md', className, ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-steel-600 text-white hover:bg-steel-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    accent: 'bg-accent-500 text-white hover:bg-accent-600 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:shadow-none',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
    in: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    out: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  }
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 hover:-translate-y-px hover:shadow-md active:translate-y-0 active:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-steel-500 disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        v[variant],
        className,
      )}
    />
  )
}

/* ---------- Badge ---------- */
const tones: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
}
export function Badge({ tone = 'slate', variant: _variant, className, children }: { tone?: keyof typeof tones | string; variant?: string; className?: string; children: ReactNode }) {
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', tones[tone] ?? tones.slate, className)}>{children}</span>
}

const statusTone: Record<string, string> = {
  'In Stock': 'green', 'Low Stock': 'amber', 'Out of Stock': 'red',
  Active: 'green', Inactive: 'slate', 'Stock In': 'green', 'Stock Out': 'red', IN: 'green', OUT: 'red',
}
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={statusTone[status] ?? 'slate'}>{status}</Badge>

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md', className)}>{children}</div>
}
export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/* ---------- Page header ---------- */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

/* ---------- Form controls ---------- */
const field = 'w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 transition-colors hover:border-slate-300 focus:border-steel-500 focus:outline-none focus:ring-2 focus:ring-steel-500/20 disabled:bg-slate-50'
export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(field, 'h-9', p.className)} />
}
export function Select({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx(field, 'h-9 pr-8', p.className)}>{children}</select>
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx(field, 'py-2', p.className)} />
}
export function Field({ label, children, hint, className, required }: { label: string; children: ReactNode; hint?: string; className?: string; required?: boolean }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

/* ---------- Table ---------- */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}
export const Th = ({ children, right, className }: { children?: ReactNode; right?: boolean; className?: string }) => (
  <th className={cx('whitespace-nowrap bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200', right ? 'text-right' : 'text-left', className)}>{children}</th>
)
export const Td = ({ children, right, className }: { children?: ReactNode; right?: boolean; className?: string }) => (
  <td className={cx('px-4 py-3 border-b border-slate-100 text-slate-700', right && 'text-right tabular-nums', className)}>{children}</td>
)
export const Tr = ({ children, onClick, className }: { children: ReactNode; onClick?: () => void; className?: string }) => (
  <tr onClick={onClick} className={cx('transition-colors hover:bg-steel-50/60', onClick && 'cursor-pointer', className)}>{children}</tr>
)
export function EmptyRow({ cols, text = 'No records match your filters.' }: { cols: number; text?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-sm text-slate-400">{text}</td>
    </tr>
  )
}

/* ---------- Pagination ---------- */
export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-500">
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></Button>
        <span className="px-2">Page {page} / {pages}</span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={14} /></Button>
      </div>
    </div>
  )
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string; count?: number }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            'whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px',
            value === t.id ? 'border-accent-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------- Modal & Drawer ---------- */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

export function Modal({ open, onClose, title, children, footer, wide, blur }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean; blur?: boolean }) {
  useEscape(onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={cx('absolute inset-0 animate-fade-in', blur ? 'backdrop-blur-sm bg-navy-950/40' : 'bg-navy-950/50')} onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('relative z-10 flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-2xl animate-pop-in', wide ? 'max-w-4xl' : 'max-w-xl')}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function Drawer({ open, onClose, title, children, footer, blur }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; blur?: boolean }) {
  useEscape(onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className={cx('absolute inset-0 animate-fade-in', blur ? 'backdrop-blur-sm bg-navy-950/40' : 'bg-navy-950/50')} onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Toaster ---------- */
export function Toaster() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg animate-pop-in">
          {t.kind === 'success' ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={18} /> : t.kind === 'error' ? <XCircle className="mt-0.5 shrink-0 text-red-500" size={18} /> : <Info className="mt-0.5 shrink-0 text-sky-500" size={18} />}
          <p className="flex-1 text-sm text-slate-700">{t.message}</p>
          <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-600" aria-label="Dismiss"><X size={14} /></button>
        </div>
      ))}
    </div>
  )
}

/* ---------- Stat ---------- */
export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value}</span>
    </div>
  )
}

/* ---------- Searchable select ---------- */
export interface Option {
  value: number
  label: string
  sub?: string
}

export function SearchSelect({ options, value, onChange, placeholder = 'Select…', className }: {
  options: Option[]
  value: number | null
  onChange: (v: number | null) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s ? options.filter((o) => o.label.toLowerCase().includes(s) || o.sub?.toLowerCase().includes(s)) : options
    return list.slice(0, 100)
  }, [options, q])

  return (
    <div ref={ref} className={cx('relative', className)} onClick={(e) => e.preventDefault()}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setQ('') }}
        className={cx(field, 'flex h-9 items-center justify-between gap-2 text-left')}
      >
        <span className={cx('truncate', !selected && 'text-slate-400')}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-10 z-40 min-w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="relative border-b border-slate-100 p-2">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to search…"
              className="h-8 w-full rounded-md border border-slate-200 pl-7 pr-2 text-sm focus:border-steel-500 focus:outline-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {value !== null && (
              <button type="button" onClick={() => { onChange(null); setOpen(false) }} className="block w-full px-3 py-1.5 text-left text-xs text-slate-400 hover:bg-slate-50">
                Clear selection
              </button>
            )}
            {filtered.length === 0 && <div className="px-3 py-4 text-center text-sm text-slate-400">No match</div>}
            {filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={cx('flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-steel-50', o.value === value && 'bg-steel-50 font-medium')}
              >
                <span className="truncate text-slate-800">{o.label}</span>
                {o.sub && <span className="shrink-0 text-xs text-slate-400">{o.sub}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Stat card ---------- */
export function StatCard({ label, value, sub, icon, tone = 'steel', onClick }: {
  label: string
  value: ReactNode
  sub?: ReactNode
  icon: ReactNode
  tone?: 'steel' | 'green' | 'red' | 'amber'
  onClick?: () => void
}) {
  const tones = {
    steel: 'bg-steel-50 text-steel-600',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <Card className={cx('group p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg', onClick && 'cursor-pointer hover:border-steel-200')}>
      <div onClick={onClick} className="flex items-start gap-4">
        <div className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-110', tones[tone])}>{icon}</div>
        <div className="min-w-0">
          <div className="text-sm text-slate-500">{label}</div>
          <div className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</div>
          {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
        </div>
      </div>
    </Card>
  )
}

/* ---------- Search box ---------- */
export function SearchBox({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  )
}

/* ---------- Confirmation Dialog ---------- */
export function ConfirmDialog({ open, onClose, title, message, onConfirm, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }: {
  open: boolean
  onClose: () => void
  title: string
  message: string
  onConfirm: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}) {
  useEscape(onClose)
  if (!open) return null

  const variants = {
    danger: 'bg-red-600 text-white hover:bg-red-700',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
    info: 'bg-steel-600 text-white hover:bg-steel-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-blur-sm bg-navy-950/40 animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl animate-pop-in">
        <div className="px-6 py-5">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm text-slate-600">{message}</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
          <Button className={variants[variant]} onClick={() => { onConfirm(); onClose() }}>{confirmText}</Button>
        </div>
      </div>
    </div>
  )
}
