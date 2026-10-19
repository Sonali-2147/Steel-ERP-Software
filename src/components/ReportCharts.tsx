import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtDate, inr, inrCompact } from '@/lib/format'
import type { RegisterRow, StockSummaryRow } from '@/lib/types'

type Props =
  | { kind: 'summary'; rows: StockSummaryRow[] }
  | { kind: 'register'; type: 'IN' | 'OUT'; rows: RegisterRow[] }

const kg = (v: unknown) => `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })} kg`
const kgShort = (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}t` : String(v))
const short = (s: string, n = 18) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function ChartCard({ title, sub, empty, children }: { title: string; sub: string; empty: boolean; children: React.ReactElement }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:break-inside-avoid">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
      {empty ? (
        <div className="grid h-60 place-items-center rounded-lg bg-slate-50 text-sm text-slate-400">No data for this period</div>
      ) : (
        <div className="h-60"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
      )}
    </div>
  )
}

const axis = { fontSize: 11, fill: '#64748b' }

export default function ReportCharts(props: Props) {
  if (props.kind === 'summary') {
    const map = new Map<string, { category: string; in: number; out: number; closing: number }>()
    for (const r of props.rows) {
      const c = r.category || 'Others'
      const e = map.get(c) ?? { category: c, in: 0, out: 0, closing: 0 }
      e.in += r.qty_in
      e.out += r.qty_out
      e.closing += Math.max(0, r.closing)
      map.set(c, e)
    }
    const cats = [...map.values()]
    const moved = cats.filter((c) => c.in || c.out).sort((a, b) => b.in + b.out - (a.in + a.out)).slice(0, 8)
    const closing = cats.filter((c) => c.closing > 0).sort((a, b) => b.closing - a.closing).slice(0, 8)
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Stock In vs Stock Out by Category" sub="Quantity moved in the selected period" empty={moved.length === 0}>
          <BarChart data={moved} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="category" tick={axis} tickFormatter={(v) => short(v, 12)} interval={0} />
            <YAxis tick={axis} tickFormatter={kgShort} />
            <Tooltip formatter={kg} cursor={{ fill: '#f1f5f9' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="in" name="Stock In" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="out" name="Stock Out" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
        <ChartCard title="Closing Stock by Category" sub="Quantity in hand at the end of the period" empty={closing.length === 0}>
          <BarChart data={closing} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tick={axis} tickFormatter={kgShort} />
            <YAxis type="category" dataKey="category" tick={axis} width={96} tickFormatter={(v) => short(v, 14)} />
            <Tooltip formatter={kg} cursor={{ fill: '#f1f5f9' }} />
            <Bar dataKey="closing" name="Closing stock" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    )
  }

  const isIn = props.type === 'IN'
  const color = isIn ? '#10b981' : '#ef4444'
  const byDate = new Map<string, number>()
  const byItem = new Map<string, number>()
  for (const r of props.rows) {
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.amount)
    byItem.set(r.item_name, (byItem.get(r.item_name) ?? 0) + r.qty)
  }
  const daily = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }))
  const top = [...byItem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, qty]) => ({ name, qty }))
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title={`Daily Stock ${isIn ? 'In' : 'Out'} Value`} sub="Amount per day in the selected period" empty={daily.length === 0}>
        <AreaChart data={daily} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${props.type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={axis} tickFormatter={(d) => fmtDate(d).slice(0, 6)} />
          <YAxis tick={axis} tickFormatter={(v) => inrCompact(v)} />
          <Tooltip formatter={(v) => inr(Number(v))} labelFormatter={(d) => fmtDate(String(d))} />
          <Area type="monotone" dataKey="amount" name="Amount" stroke={color} strokeWidth={2} fill={`url(#grad-${props.type})`} />
        </AreaChart>
      </ChartCard>
      <ChartCard title={`Top Items ${isIn ? 'Received' : 'Dispatched'}`} sub="By quantity in the selected period" empty={top.length === 0}>
        <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" tick={axis} tickFormatter={kgShort} />
          <YAxis type="category" dataKey="name" tick={axis} width={130} tickFormatter={(v) => short(v, 20)} />
          <Tooltip formatter={kg} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="qty" name="Quantity" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ChartCard>
    </div>
  )
}
