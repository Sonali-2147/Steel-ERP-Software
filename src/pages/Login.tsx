import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, BarChart3, Boxes, Lock, LogIn, Package, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const YEAR = new Date().getFullYear()

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
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
    { icon: Package, text: 'Item master with bulk Excel import' },
    { icon: ArrowDownToLine, text: 'Stock In from suppliers' },
    { icon: ArrowUpFromLine, text: 'Stock Out to customers' },
    { icon: BarChart3, text: 'Live stock reports & charts' },
  ]

  const input =
    'h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm transition hover:border-steel-400 focus:border-steel-500 focus:outline-none focus:ring-4 focus:ring-steel-500/15'

  return (
    <div className="relative flex min-h-screen bg-navy-900 bg-cover bg-center" style={{ backgroundImage: "url('./login-bg.jpg')" }}>
      <div className="absolute inset-0 bg-gradient-to-r from-navy-900/95 via-navy-900/80 to-navy-900/60" />

      <div className="relative hidden flex-1 flex-col justify-between p-12 text-white lg:flex xl:p-16">
        <div className="group flex w-fit items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-500 shadow-lg shadow-accent-500/30 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"><Boxes size={24} /></div>
          <div>
            <div className="text-xl font-bold">Steel ERP</div>
            <div className="text-sm text-slate-300">Stock Management</div>
          </div>
        </div>
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold leading-tight xl:text-5xl">Know your stock.<br /><span className="text-accent-400">Every kg, every day.</span></h1>
          <ul className="mt-10 space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="group flex cursor-default items-center gap-3 rounded-xl px-3 py-2 text-slate-200 transition duration-200 hover:translate-x-1 hover:bg-white/10 hover:text-white">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 transition group-hover:bg-accent-500"><Icon size={18} /></span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="text-xs text-slate-400">© {YEAR} Steel ERP</div>
      </div>

      <div className="relative flex w-full items-center justify-center p-6 lg:w-[480px] lg:bg-white lg:p-12 lg:shadow-2xl xl:w-[540px]">
        <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-500 text-white"><Boxes size={22} /></div>
            <div className="leading-tight">
              <div className="text-lg font-bold text-slate-900">Steel ERP</div>
              <div className="text-xs text-slate-500">Stock Management</div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Admin login – sign in to manage your stock</p>

          <label className="mt-8 block text-sm font-medium text-slate-700">Username</label>
          <div className="group relative mt-1.5">
            <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-steel-600" />
            <input autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="Enter username" className={input} />
          </div>

          <label className="mt-5 block text-sm font-medium text-slate-700">Password</label>
          <div className="group relative mt-1.5">
            <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-steel-600" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter password" className={input} />
          </div>

          {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

          <button type="submit" disabled={busy}
            className="group mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-steel-600 text-sm font-semibold text-white shadow-lg shadow-steel-600/25 transition duration-200 hover:-translate-y-0.5 hover:bg-steel-700 hover:shadow-xl hover:shadow-steel-600/30 active:translate-y-0 disabled:opacity-60">
            <LogIn size={17} className="transition-transform group-hover:translate-x-0.5" /> {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
