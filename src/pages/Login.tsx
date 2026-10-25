import { useState } from 'react'
import { ArrowDownToLine, BarChart3, Boxes, CreditCard, Eye, EyeOff, FileText, Lock, LogIn, Package, Receipt, User, Users } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const YEAR = new Date().getFullYear()

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(username, password)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const features = [
    { icon: Package, text: 'Items & bulk import' },
    { icon: ArrowDownToLine, text: 'Stock In / Stock Out' },
    { icon: FileText, text: 'Purchase & sales invoices' },
    { icon: Receipt, text: 'Quotations & expenses' },
    { icon: CreditCard, text: 'Payment tracking' },
    { icon: Users, text: 'Supplier & customer accounts' },
    { icon: BarChart3, text: 'Reports, registers & insights' },
  ]

  const input =
    'h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm transition hover:border-steel-400 focus:border-steel-500 focus:outline-none focus:ring-4 focus:ring-steel-500/15'

  return (
    <div className="relative flex min-h-screen bg-navy-900 bg-cover bg-center" style={{ backgroundImage: "url('./login-bg.jpg')" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-navy-950/95 via-navy-900/85 to-steel-700/60" />

      <div className="relative hidden flex-1 flex-col justify-between p-10 text-white lg:flex xl:p-16">
        <div className="group flex w-fit items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-500 shadow-lg shadow-accent-500/30 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"><Boxes size={24} /></div>
          <div>
            <div className="text-xl font-bold">Krishna Steel Center</div>
            <div className="text-sm text-slate-300">Stock Management</div>
          </div>
        </div>
        <div className="max-w-2xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">Steel business, simplified</div>
          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">Your stock and business,<br /><span className="text-accent-400">all in one place.</span></h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">Manage daily operations, keep transactions organized, and see how your business is performing.</p>
          <ul className="mt-7 grid grid-cols-2 gap-2">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-slate-100 backdrop-blur-sm">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 text-accent-400"><Icon size={16} /></span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="text-xs text-slate-400">© {YEAR} Krishna Steel Center</div>
      </div>

      <div className="relative flex w-full items-center justify-center p-5 sm:p-8 lg:w-[480px] lg:bg-white lg:p-12 lg:shadow-2xl xl:w-[540px]">
        <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-white/70 bg-white p-7 shadow-2xl shadow-navy-950/25 sm:p-9 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-500 text-white"><Boxes size={22} /></div>
            <div className="leading-tight">
              <div className="text-lg font-bold text-slate-900">Krishna Steel Center</div>
              <div className="text-xs text-slate-500">Stock Management</div>
            </div>
          </div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-steel-50 px-2.5 py-1 text-xs font-medium text-steel-700">
            <Lock size={12} /> Secure administrator access
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Admin login – sign in to manage your stock</p>

          <label className="mt-8 block text-sm font-medium text-slate-700">Username</label>
          <div className="group relative mt-1.5">
            <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-steel-600" />
            <input autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Enter username" className={input} />
          </div>

          <label className="mt-5 block text-sm font-medium text-slate-700">Password</label>
          <div className="group relative mt-1.5">
            <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-steel-600" />
            <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter password" className={`${input} pr-12`} />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-steel-500"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={busy}
            className="group mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-steel-700 to-steel-500 text-sm font-semibold text-white shadow-lg shadow-steel-600/25 transition duration-200 hover:-translate-y-0.5 hover:from-steel-800 hover:to-steel-600 hover:shadow-xl hover:shadow-steel-600/30 active:translate-y-0 disabled:opacity-60">
            <LogIn size={17} className="transition-transform group-hover:translate-x-0.5" /> {busy ? 'Signing in…' : 'Sign In'}
          </button>
          <p className="mt-5 text-center text-xs text-slate-400">Authorized users only · © {YEAR} Krishna Steel Center</p>
        </form>
      </div>
    </div>
  )
}
